"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "../..");

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`JSON inválido ou inacessível: ${filePath} (${error.message})`);
  }
}

function parseOptions(args, valueOptions = []) {
  const options = {};
  const values = new Set(valueOptions);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Parâmetro desconhecido: ${arg}`);
    }
    const equalIndex = arg.indexOf("=");
    const name = equalIndex === -1 ? arg : arg.slice(0, equalIndex);
    if (!values.has(name)) {
      if (equalIndex !== -1) {
        throw new Error(`Parâmetro desconhecido: ${name}`);
      }
      options[name] = true;
      continue;
    }
    const value = equalIndex === -1 ? args[++index] : arg.slice(equalIndex + 1);
    if (!value || value.startsWith("--")) {
      throw new Error(`Parâmetro ${name} exige um valor.`);
    }
    options[name] = value;
  }
  return options;
}

function assertTaskId(taskId) {
  if (!/^task\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(taskId || "")) {
    throw new Error("taskId inválido; use task/<slug> com letras minúsculas, números e hífens.");
  }
}

function assertSafeRelative(relativePath, label) {
  if (!relativePath || relativePath.includes("\0") || path.isAbsolute(relativePath)) {
    throw new Error(`${label} deve ser um caminho relativo seguro.`);
  }
  const normalized = relativePath.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`${label} contém segmentos inseguros.`);
  }
  return normalized;
}

function assertProjectPath(projectPath) {
  if (!projectPath || projectPath.includes("\0")) {
    throw new Error("project-path inválido.");
  }
  return path.resolve(projectPath);
}

function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function resolveLockPath(projectRoot, lockfile, taskId) {
  const defaultName = `${taskId.slice("task/".length)}.lock.json`;
  const relative = assertSafeRelative(lockfile || `DEV/WORKFLOWS/${defaultName}`, "lockfile");
  const resolved = path.resolve(projectRoot, relative);
  const workflowsRoot = path.resolve(projectRoot, "DEV", "WORKFLOWS");
  if (!inside(workflowsRoot, resolved) || path.extname(resolved) !== ".json") {
    throw new Error("lockfile deve ficar dentro de DEV/WORKFLOWS/ e terminar em .json.");
  }
  return { relative: relative.replaceAll("\\", "/"), absolute: resolved };
}

function resolveStatePath(projectRoot, taskId) {
  assertTaskId(taskId);
  const slug = taskId.slice("task/".length);
  const stateRoot = path.resolve(projectRoot, ".local", "orquestrador", "workflow-state");
  return { root: stateRoot, absolute: path.join(stateRoot, `${slug}.json`) };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

function digestLock(lock) {
  const copy = { ...lock };
  delete copy.lockDigest;
  return `sha256:${crypto.createHash("sha256").update(canonicalJson(copy), "utf8").digest("hex")}`;
}

function atomicWrite(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, filePath);
  } catch (error) {
    try { fs.rmSync(temporary, { force: true }); } catch {}
    throw error;
  }
}

function findGitRoot(projectRoot) {
  let current = projectRoot;
  while (true) {
    if (fs.existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function hasIgnoredLocal(projectRoot) {
  const gitRoot = findGitRoot(projectRoot);
  if (!gitRoot) return { git: false, ignored: true };
  const ignoreFiles = [];
  let current = projectRoot;
  while (inside(gitRoot, current)) {
    ignoreFiles.push(path.join(current, ".gitignore"));
    if (current === gitRoot) break;
    current = path.dirname(current);
  }
  const patterns = ignoreFiles.filter(fs.existsSync).flatMap((file) => fs.readFileSync(file, "utf8").split(/\r?\n/));
  return { git: true, ignored: patterns.some((line) => /^\s*\.local\/?\s*(?:#.*)?$/.test(line)) };
}

function assertLocalPolicy(projectRoot) {
  const result = hasIgnoredLocal(projectRoot);
  if (result.git && !result.ignored) {
    throw new Error("O projeto está sob Git, mas .local/ não está ignorado; adicione .local/ ao .gitignore antes de inicializar o state.");
  }
  return result;
}

function loadWorkflow(workflowName) {
  const schema = readJson(path.join(packageRoot, "orquestrador", "WORKFLOW_SCHEMAS.json"));
  const workflow = schema.workflows[workflowName];
  if (!workflow) throw new Error(`Workflow desconhecido: ${workflowName}`);
  return workflow;
}

function loadManifest() {
  return readJson(path.join(packageRoot, "orquestrador", "SKILLS_MANIFEST.json"));
}

function validateLockShape(lock) {
  if (!lock || lock.version !== 1 || typeof lock.taskId !== "string" || typeof lock.workflow !== "string") {
    throw new Error("Lock inválido: campos básicos ausentes.");
  }
  assertTaskId(lock.taskId);
  if (!lock.lockDigest || lock.lockDigest !== digestLock(lock)) throw new Error("lock-drift: digest do lock não confere.");
  if (!lock.resolved || !Array.isArray(lock.resolved.steps) || !Array.isArray(lock.resolved.gates)) {
    throw new Error("Lock inválido: resolved.steps e resolved.gates são obrigatórios.");
  }
  if (!lock.provenance || !Array.isArray(lock.provenance.evidence) || lock.provenance.evidence.length === 0 || lock.provenance.evidence.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error("Lock inválido: provenance.evidence deve ser string[] não vazio.");
  }
  return lock;
}

function loadLock(lockPath) {
  return validateLockShape(readJson(lockPath));
}

function stateStatusForStep(stepId) {
  if (stepId === "verify") return "verification";
  if (stepId === "ship") return "review";
  return stepId === "discuss" ? "ready" : "in-progress";
}

module.exports = {
  atomicWrite,
  assertProjectPath,
  assertSafeRelative,
  assertTaskId,
  canonicalJson,
  digestLock,
  loadLock,
  loadManifest,
  loadWorkflow,
  packageRoot,
  parseOptions,
  resolveLockPath,
  resolveStatePath,
  assertLocalPolicy,
  stateStatusForStep,
  validateLockShape
};

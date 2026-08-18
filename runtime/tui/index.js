"use strict";

const fs = require("node:fs");
const os = require("node:os");
const readline = require("node:readline");
const { parseCommandLine } = require("../shell/parse-command-line");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const sourceEntrypoint = path.join(__dirname, "opentui.ts");

function probeExecutable(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
  } catch {
    return false;
  }
  try {
    const result = spawnSync(filePath, ["--version"], { stdio: "ignore", shell: false, timeout: 10_000 });
    return !result.error && result.status === 0;
  } catch {
    return false;
  }
}

function bunBinaryCandidates() {
  const candidates = [];
  let dir = __dirname;
  for (let depth = 0; depth < 6; depth += 1) {
    candidates.push(path.join(dir, "node_modules", ".bin", "bun"));
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  candidates.push(path.join(os.homedir(), ".bun", "bin", "bun"));
  return candidates;
}

function findBunBinary(candidates) {
  const list = candidates ?? bunBinaryCandidates();
  for (const candidate of list) {
    if (probeExecutable(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveTuiRunner({ bunAvailable = false } = {}) {
  if (bunAvailable) {
    return { command: "bun", args: [sourceEntrypoint], renderer: "opentui-bun" };
  }
  const binary = findBunBinary();
  if (binary) {
    return { command: binary, args: [sourceEntrypoint], renderer: "opentui-bun" };
  }
  return null;
}

function renderDashboard(project, { runs = [], skills = [], terminals = [], capabilities } = {}) {
  const groups = skills.reduce((result, skill) => { const key = skill.source || "user"; result[key] = (result[key] || 0) + 1; return result; }, {});
  return [
    "Maestro · Project Manager",
    `${project.name} · ${project.status}`,
    project.path,
    `Runs: ${runs.length} | Sessões nativas: ${terminals.length}`,
    `Skills: Maestro ${groups.maestro || 0} · Usuário ${groups.user || 0} · Projeto ${groups.project || 0}`,
    "",
    capabilities && !capabilities.backends.tmux ? "tmux indisponível: instale-o manualmente para sessões persistentes." : "",
    capabilities && !capabilities.tui.bun ? "TUI OpenTUI experimental indisponível (Bun/OpenTUI). Usando painel clássico." : "",
    "[r] runs  [s] skills  [t] sessões  [a] agente  [h] shell  [u] anexar  [x] encerrar  [q] sair"
  ].filter(Boolean).join("\n");
}

async function startTui(application, { input = process.stdin, output = process.stdout, classic = false } = {}) {
  if (!classic) return startOpenTui(application, { input, output });
  const project = await application.inspectProject();
  const [runs, skills, terminals] = await Promise.all([
    application.listRuns({ projectId: project.id }), application.skills.list(), application.listTerminalSessions({ projectId: project.id })
  ]);
  const capabilities = application.terminalCapabilities();
  output.write(`${renderDashboard(project, { runs, skills, terminals, capabilities })}\n`);
  if (!input.isTTY || !output.isTTY) return { interactive: false, project };
  const rl = readline.createInterface({ input, output, prompt: "maestro> " });
  rl.prompt();
  return new Promise((resolve) => rl.on("line", async (line) => {
    const trimmed = line.trim();
    const spaceIndex = trimmed.indexOf(" ");
    const rawChoice = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
    const rawArgs = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();
    const choice = rawChoice.toLowerCase();
    if (choice === "q" || choice === "quit" || choice === "exit") { rl.close(); return; }
    if (choice === "r") output.write(`${JSON.stringify(await application.listRuns({ projectId: project.id }), null, 2)}\n`);
    else if (choice === "s") output.write(`${JSON.stringify(application.skills.list(), null, 2)}\n`);
    else if (choice === "t") output.write(`${JSON.stringify(await application.listTerminalSessions({ projectId: project.id }), null, 2)}\n`);
    else if (choice === "a") {
      const providerId = rawArgs;
      if (!providerId) { output.write("Uso: a <codex|claude|opencode|agy>\n"); rl.prompt(); return; }
      try { output.write(`${JSON.stringify(await application.createTerminalSession({ workspacePath: project.path, kind: "agent", providerId, backend: "tmux" }), null, 2)}\n`); } catch (error) { output.write(`Erro: ${error.message}\n`); }
    } else if (choice === "h") {
      let command; let args;
      try { [command, ...args] = parseCommandLine(rawArgs); } catch { output.write("Comando inválido: aspas não fechadas.\n"); rl.prompt(); return; }
      if (!command) { output.write("Uso: h <comando> [argumentos]\n"); rl.prompt(); return; }
      try { output.write(`${JSON.stringify(await application.createTerminalSession({ workspacePath: project.path, kind: "shell", command, args, backend: "tmux" }), null, 2)}\n`); } catch (error) { output.write(`Erro: ${error.message}\n`); }
    } else if (choice === "u") {
      const terminalId = rawArgs;
      if (!terminalId) { output.write("Uso: u <id-da-sessão>\n"); rl.prompt(); return; }
      try { await application.attachTerminalSession(terminalId); } catch (error) { output.write(`Erro: ${error.message}\n`); }
    } else if (choice === "x") {
      const terminalId = rawArgs;
      if (!terminalId) { output.write("Uso: x <id-da-sessão>\n"); rl.prompt(); return; }
      output.write((await application.closeTerminalSession(terminalId)) ? "Sessão encerrada.\n" : "Sessão não encontrada.\n");
    } else output.write("Comando inválido. Use r, s, t, a, h, u, x ou q.\n");
    rl.prompt();
  }).on("close", () => resolve({ interactive: true, project })));
}

function startOpenTui(application, { input, output }) {
  const capabilities = application.terminalCapabilities();
  const runner = resolveTuiRunner({ bunAvailable: Boolean(capabilities?.tui?.bun) });
  if (!runner) {
    throw new Error("A TUI visual canônica requer o runtime Bun (experimental com node:ffi é indisponível no Node atual). Instale o Bun (https://bun.sh) ou reinstale o pacote sem --ignore-scripts.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn(runner.command, [...runner.args, "--project-path", application.projectRoot], { stdio: [input, output, process.stderr], shell: false });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve({ interactive: true, renderer: runner.renderer }) : reject(new Error(`A TUI OpenTUI terminou com código ${code}.`)));
  });
}

module.exports = { findBunBinary, renderDashboard, resolveTuiRunner, startOpenTui, startTui };

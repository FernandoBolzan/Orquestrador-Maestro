#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const orchestratorRoot = path.join(repoRoot, "orquestrador");
const skillsRoot = path.join(orchestratorRoot, "skills");
const manifestPath = path.join(orchestratorRoot, "SKILLS_MANIFEST.json");
const routerPath = path.join(orchestratorRoot, "SKILLS_ROUTER.json");
const aliasesPath = path.join(orchestratorRoot, "SKILL_ALIASES.json");
const chainsPath = path.join(orchestratorRoot, "SKILL_CHAINS.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === "mirror-everywhere") {
      args.mirrorEverywhere = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index++;
    if (key === "trigger" || key === "alias") {
      args[key] = args[key] || [];
      args[key].push(value);
    } else {
      args[key] = value;
    }
  }
  return args;
}

function normalizeSkillName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/^\/?skill:/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assertSkillName(name) {
  if (!/^skill-[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/.test(name)) {
    throw new Error(`Invalid skill name: ${name}. Use skill-<lowercase-hyphen-name>, max 64 chars.`);
  }
}

function unique(values) {
  return Array.from(new Set((values || []).map((value) => String(value).trim()).filter(Boolean)));
}

function readFrontmatter(skillFile) {
  const text = fs.readFileSync(skillFile, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;
    result[pair[1]] = pair[2].trim().replace(/^["']|["']$/g, "");
  }
  return result;
}

function createSkill(args) {
  const name = normalizeSkillName(args.name);
  assertSkillName(name);

  const description = String(args.description || "").trim();
  const category = String(args.category || "").trim();
  const risk = String(args.risk || "").trim();
  const source = String(args.source || "local-patterns").trim();
  const triggers = unique(args.trigger);
  const aliases = unique(args.alias);

  if (!description || !category || !risk) {
    throw new Error("--description, --category, and --risk are required.");
  }
  if (triggers.length === 0) {
    throw new Error("At least one --trigger is required.");
  }

  const skillDir = path.join(skillsRoot, name);
  const skillFile = path.join(skillDir, "SKILL.md");
  if (fs.existsSync(skillFile)) {
    throw new Error(`Skill already exists: ${skillFile}`);
  }

  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    skillFile,
    `---\nname: ${name}\ndescription: ${description}\ncategory: ${category}\nrisk: ${risk}\nsource: ${source}\n---\n\n# ${name}\n\n## Core Workflow\n\n1. Identify the project context, existing patterns, and the smallest useful scope.\n2. Apply this skill only when the request matches its description or router triggers.\n3. Keep implementation details local to the target project and avoid exposing secrets or private data.\n4. Verify with the lightest meaningful command or inspection for the risk level.\n\n## Guardrails\n\n- Keep this skill compact; move long details into \`references/\` and link them from this file.\n- Do not include tokens, local paths, logs, private project names, or stale API examples.\n- Prefer project evidence over generic assumptions.\n\n## Verification\n\n- Confirm the requested behavior or decision is covered by local evidence.\n- Run the relevant project validation gate when code, config, or operational behavior changes.\n\n## Related Skills\n\n- None yet.\n`,
    "utf8"
  );

  const manifest = fs.existsSync(manifestPath)
    ? readJson(manifestPath)
    : { version: 1, purpose: "Canonical Orquestrador skill registry.", skills: {} };
  manifest.skills[name] = {
    description,
    category,
    risk,
    source,
    mirrorEverywhere: Boolean(args.mirrorEverywhere),
    triggers,
    aliases,
    status: "canonical",
  };
  writeJson(manifestPath, manifest);

  const router = readJson(routerPath);
  router.skills[name] = {
    description,
    triggers,
    canonicalPath: `{{USER_HOME}}/.orquestrador/skills/${name}/SKILL.md`,
    codexPath: `{{USER_HOME}}/.codex/skills/${name}/SKILL.md`,
    cost: risk === "high" ? "high" : risk === "medium" ? "medium" : "low",
    safety: "task-specific-guardrails",
  };
  writeJson(routerPath, router);

  const aliasDoc = readJson(aliasesPath);
  for (const alias of aliases) {
    aliasDoc.aliases[alias] = name;
  }
  writeJson(aliasesPath, aliasDoc);

  console.log(`Created ${path.relative(repoRoot, skillFile)}`);
  console.log(`Updated ${path.relative(repoRoot, manifestPath)}, SKILLS_ROUTER.json, and SKILL_ALIASES.json`);
}

function validate() {
  const issues = [];
  const manifest = readJson(manifestPath);
  const router = readJson(routerPath);
  const aliases = readJson(aliasesPath);
  const chains = readJson(chainsPath);
  const manifestSkills = manifest.skills || {};
  const routerSkills = router.skills || {};

  for (const [name, entry] of Object.entries(manifestSkills)) {
    if (normalizeSkillName(name) !== name) issues.push(`manifest:${name}: name is not normalized`);
    try {
      assertSkillName(name);
    } catch (error) {
      issues.push(`manifest:${name}: ${error.message}`);
    }
    for (const field of ["description", "category", "risk", "source", "status"]) {
      if (!entry[field]) issues.push(`manifest:${name}: missing ${field}`);
    }

    const skillFile = path.join(skillsRoot, name, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      issues.push(`skills/${name}: missing SKILL.md`);
      continue;
    }
    const text = fs.readFileSync(skillFile, "utf8");
    const frontmatter = readFrontmatter(skillFile);
    for (const field of ["name", "description", "category", "risk", "source"]) {
      if (!frontmatter[field]) issues.push(`skills/${name}/SKILL.md: missing frontmatter ${field}`);
    }
    if (frontmatter.name && frontmatter.name !== name) {
      issues.push(`skills/${name}/SKILL.md: frontmatter name does not match directory`);
    }
    if (/\b(TODO|FIXME|stub|placeholder)\b/i.test(text)) {
      issues.push(`skills/${name}/SKILL.md: contains TODO/FIXME/stub/placeholder text`);
    }
    if (/(?:Ã.|Â.|â(?:€|‚|„|™|œ|–|—|…))/.test(text)) {
      issues.push(`skills/${name}/SKILL.md: possible mojibake`);
    }
    if (!routerSkills[name]) issues.push(`router:${name}: missing router entry`);
  }

  for (const dirent of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const name = dirent.name;
    if (!fs.existsSync(path.join(skillsRoot, name, "SKILL.md"))) continue;
    if (!manifestSkills[name]) issues.push(`manifest:${name}: skill directory is not registered`);
  }

  for (const [name, entry] of Object.entries(routerSkills)) {
    if (!manifestSkills[name]) issues.push(`router:${name}: no manifest entry`);
    for (const field of ["description", "triggers", "canonicalPath", "codexPath", "cost", "safety"]) {
      if (!entry[field]) issues.push(`router:${name}: missing ${field}`);
    }
    if (!Array.isArray(entry.triggers) || entry.triggers.length === 0) {
      issues.push(`router:${name}: triggers must be a non-empty array`);
    }
  }

  for (const [alias, skill] of Object.entries(aliases.aliases || {})) {
    if (!manifestSkills[skill]) issues.push(`aliases:${alias}: points to missing skill ${skill}`);
  }

  for (const [skill, chain] of Object.entries(chains.chains || {})) {
    if (!manifestSkills[skill]) issues.push(`chains:${skill}: chain owner is not in manifest`);
    for (const target of chain.mayInvoke || []) {
      if (!manifestSkills[target]) issues.push(`chains:${skill}: mayInvoke points to missing skill ${target}`);
    }
  }

  if (issues.length > 0) {
    console.error("Skill validation failed:");
    for (const issue of issues.sort()) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log(`Skill validation passed. Skills: ${Object.keys(manifestSkills).length}`);
}

function printMirrorEverywhere() {
  const manifest = readJson(manifestPath);
  for (const [name, entry] of Object.entries(manifest.skills || {})) {
    if (entry.mirrorEverywhere) console.log(name);
  }
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === "new") createSkill(parseArgs(rest));
  else if (command === "validate") validate();
  else if (command === "mirror-everywhere") printMirrorEverywhere();
  else {
    console.error("Usage: skill-catalog.js <new|validate|mirror-everywhere> [options]");
    process.exit(2);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

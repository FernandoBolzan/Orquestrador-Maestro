#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MAX_ENTRIES = 12;
const STANDARD_PHASES = new Set(["discuss", "plan", "execute", "verify", "ship", "handoff"]);

function printHelp() {
  console.log(`DEV gates

Usage:
  node check-dev-gates.js [--project-path PATH] [--max-entries N] [--strict]
`);
}

function normalizeArgs(argv) {
  const normalized = [];
  for (const arg of argv) {
    if (arg.startsWith("--") && arg.includes("=")) {
      const index = arg.indexOf("=");
      normalized.push(arg.slice(0, index), arg.slice(index + 1));
      continue;
    }
    normalized.push(arg);
  }
  return normalized;
}

function parseArgs(argv) {
  const options = { projectPath: process.cwd(), maxEntries: DEFAULT_MAX_ENTRIES, strict: false };
  const args = normalizeArgs(argv);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h" || arg === "help") {
      options.help = true;
      continue;
    }
    if (arg === "--strict") {
      options.strict = true;
      continue;
    }
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Parameter ${arg} requires a value.`);
    }
    if (arg === "--project-path") {
      options.projectPath = next;
    } else if (arg === "--max-entries") {
      options.maxEntries = ensureInteger(next, "Max entries", DEFAULT_MAX_ENTRIES);
    } else {
      throw new Error(`Unknown parameter: ${arg}`);
    }
    index += 1;
  }

  return options;
}

function ensureInteger(value, label, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function resolveDevRoot(projectPathOption) {
  const projectRoot = path.resolve(projectPathOption || process.cwd());
  const devRoot = path.join(projectRoot, "DEV");
  if (!fs.existsSync(devRoot) || !fs.statSync(devRoot).isDirectory()) {
    throw new Error(`DEV directory not found: ${devRoot}`);
  }
  return { projectRoot, devRoot };
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(content, heading) {
  const pattern = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "m");
  const match = content.match(pattern);
  return match ? match[1].trim() : "";
}

function meaningfulSectionLines(content, heading) {
  const section = extractSection(content, heading);
  if (!section) {
    return [];
  }

  return section.split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || line === "-" || line.startsWith("```")) {
        return false;
      }
      const normalized = line.replace(/^-\s*/, "").trim();
      if (!normalized) {
        return false;
      }
      return !/^[A-Za-z][A-Za-z /-]*:\s*$/.test(normalized);
    });
}

function hasMeaningfulSectionContent(content, heading) {
  return meaningfulSectionLines(content, heading).length > 0;
}

function extractBullet(source, labels) {
  const candidates = Array.isArray(labels) ? labels : [labels];
  for (const label of candidates) {
    const pattern = new RegExp(`^-\\s*${escapeRegex(label)}:\\s*(.+)$`, "im");
    const match = source.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return "";
}

function isPlaceholderValue(value) {
  if (!value) {
    return true;
  }
  const normalized = value.trim();
  return normalized === "-" || (normalized.startsWith("[") && normalized.endsWith("]"));
}

function trimTrailingBlankLines(lines) {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1].trim() === "") {
    result.pop();
  }
  return result;
}

function parseWorklog(content) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const entries = [];
  let inFence = false;
  let current = null;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
    }

    const isEntryHeader = !inFence && /^## /.test(line) && !/^## Template\b/.test(line);
    if (isEntryHeader) {
      if (current) {
        current.lines = trimTrailingBlankLines(current.lines);
        current.raw = current.lines.join("\n");
        entries.push(current);
      }
      current = { header: line.trim(), lines: [line] };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    current.lines = trimTrailingBlankLines(current.lines);
    current.raw = current.lines.join("\n");
    entries.push(current);
  }

  return entries;
}

function parsePhaseState(specContent) {
  const statusSection = extractSection(specContent, "Status");
  const phase = extractBullet(statusSection, ["Phase", "phase"]);
  const status = extractBullet(statusSection, ["Status", "status"]);
  const nextGate = extractBullet(statusSection, ["Next gate", "NextGate", "nextGate"]);
  const startedAt = extractBullet(statusSection, ["Started at", "StartedAt", "startedAt"]);
  const hasStructuredState = Boolean(phase || status || nextGate || startedAt);

  return {
    mode: hasStructuredState ? "structured" : "legacy",
    phase,
    status,
    nextGate,
    startedAt
  };
}

function isIsoLikeTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2}(?:[T ][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.\d{1,3})?)?(?:Z|[+-][0-9]{2}:[0-9]{2})?)?$/u.test(value);
}

function buildRequiredPaths(devRoot) {
  return {
    readme: path.join(devRoot, "README.md"),
    index: path.join(devRoot, "INDEX.md"),
    handoff: path.join(devRoot, "HANDOFF.md"),
    context: path.join(devRoot, "CONTEXT.md"),
    worklog: path.join(devRoot, "WORKLOG.md"),
    verify: path.join(devRoot, "VERIFY.md"),
    spec: path.join(devRoot, "SPECS", "ACTIVE.md")
  };
}

function addFinding(target, severity, message, action) {
  target.push({ severity, message, action });
}

function addMissingFile(target, filePath, label, projectRoot) {
  addFinding(
    target,
    "error",
    `${label} missing: ${filePath}`,
    `Run \`orquestrador-maestro init-dev --project-path ${projectRoot}\` or create \`${path.relative(projectRoot, filePath).replace(/\\/g, "/")}\`.`
  );
}

function validateRequiredFiles(findings, requiredPaths, projectRoot) {
  for (const [label, filePath] of Object.entries(requiredPaths)) {
    if (!fs.existsSync(filePath)) {
      addMissingFile(findings, filePath, `DEV ${label}`, projectRoot);
    }
  }
}

function validateIndex(findings, requiredPaths) {
  if (!fs.existsSync(requiredPaths.index)) {
    return;
  }
  const content = readUtf8(requiredPaths.index);
  const markers = ["HANDOFF.md", "WORKLOG.md", "VERIFY.md", "SPECS/ACTIVE.md"];
  for (const marker of markers) {
    if (!content.includes(marker)) {
      addFinding(
        findings,
        "error",
        `DEV index missing expected marker \`${marker}\`: ${requiredPaths.index}`,
        `Add \`${marker}\` to \`DEV/INDEX.md\` so agents can find the canonical DEV files quickly.`
      );
    }
  }
}

function validateHeadings(findings, filePath, label, headings) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = readUtf8(filePath);
  for (const heading of headings) {
    const pattern = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`, "m");
    if (!pattern.test(content)) {
      addFinding(
        findings,
        "error",
        `${label} missing heading \`## ${heading}\`: ${filePath}`,
        `Add a \`## ${heading}\` section to \`${path.basename(filePath)}\` following the DEV hierarchy contract.`
      );
    }
  }
}

function validateHandoff(findings, requiredPaths, strict) {
  if (!fs.existsSync(requiredPaths.handoff)) {
    return;
  }

  validateHeadings(findings, requiredPaths.handoff, "DEV handoff", ["Snapshot", "Latest Work", "Recent Entries"]);
  if (!strict) {
    return;
  }

  const content = readUtf8(requiredPaths.handoff);
  const structuredFields = {
    updated: extractBullet(content, "Updated"),
    entry: extractBullet(content, "Entry"),
    spec: extractBullet(content, "Spec"),
    changed: extractBullet(content, "Changed"),
    verified: extractBullet(content, "Verified"),
    nextContext: extractBullet(content, "Next context")
  };

  const usesStructuredHandoff = Object.values(structuredFields).some(Boolean);
  if (usesStructuredHandoff) {
    for (const [label, value] of Object.entries(structuredFields)) {
      if (!value || isPlaceholderValue(value)) {
        addFinding(
          findings,
          "error",
          `DEV handoff has placeholder or empty \`${label}:\` in ${requiredPaths.handoff}`,
          `Fill \`${label}:\` in \`DEV/HANDOFF.md\` or remove the partial structured handoff fields and keep the legacy section-based format.`
        );
      }
    }
    return;
  }

  if (!hasMeaningfulSectionContent(content, "Snapshot")) {
    addFinding(
      findings,
      "error",
      `DEV handoff has no substantive \`## Snapshot\` content in ${requiredPaths.handoff}`,
      "Record the current project/task snapshot in `DEV/HANDOFF.md`."
    );
  }
  if (!hasMeaningfulSectionContent(content, "Latest Work")) {
    addFinding(
      findings,
      "error",
      `DEV handoff has no substantive \`## Latest Work\` content in ${requiredPaths.handoff}`,
      "Summarize the latest completed work in `DEV/HANDOFF.md`."
    );
  }
  const hasNextAction = hasMeaningfulSectionContent(content, "Next Action") || !isPlaceholderValue(extractBullet(content, "Next context"));
  if (!hasNextAction) {
    addFinding(
      findings,
      "error",
      `DEV handoff has no concrete next action in ${requiredPaths.handoff}`,
      "Add a `## Next Action` section or a `- Next context:` bullet to `DEV/HANDOFF.md`."
    );
  }
}

function validateContext(findings, requiredPaths) {
  validateHeadings(findings, requiredPaths.context, "DEV context", ["State", "Commands", "Constraints And Risks", "Next Context"]);
}

function validateVerify(findings, requiredPaths, strict) {
  if (!fs.existsSync(requiredPaths.verify)) {
    return;
  }

  validateHeadings(findings, requiredPaths.verify, "DEV verify", ["Latest Verification", "Commands", "Outcome"]);
  if (!strict) {
    return;
  }

  const content = readUtf8(requiredPaths.verify);
  const date = extractBullet(content, "Date");
  const scope = extractBullet(content, "Scope");
  if (date && isPlaceholderValue(date)) {
    addFinding(
      findings,
      "error",
      `DEV verify has placeholder \`Date:\` in ${requiredPaths.verify}`,
      "Replace the `Date:` placeholder in `DEV/VERIFY.md` with the latest verification date."
    );
  }
  if (scope && isPlaceholderValue(scope)) {
    addFinding(
      findings,
      "error",
      `DEV verify has placeholder \`Scope:\` in ${requiredPaths.verify}`,
      "Replace the `Scope:` placeholder in `DEV/VERIFY.md` with the verified area."
    );
  }
  if (!hasMeaningfulSectionContent(content, "Latest Verification")) {
    addFinding(
      findings,
      "error",
      `DEV verify has no substantive \`## Latest Verification\` content in ${requiredPaths.verify}`,
      "Summarize the latest verification result in `DEV/VERIFY.md`."
    );
  }
  if (!hasMeaningfulSectionContent(content, "Commands")) {
    addFinding(
      findings,
      "error",
      `DEV verify has no substantive \`## Commands\` content in ${requiredPaths.verify}`,
      "List the verification commands under `## Commands` in `DEV/VERIFY.md`."
    );
  }
  if (!hasMeaningfulSectionContent(content, "Outcome")) {
    addFinding(
      findings,
      "error",
      `DEV verify has no substantive \`## Outcome\` content in ${requiredPaths.verify}`,
      "Summarize what passed or failed under `## Outcome` in `DEV/VERIFY.md`."
    );
  }
}

function validateSpec(findings, warnings, requiredPaths, strict) {
  if (!fs.existsSync(requiredPaths.spec)) {
    return { mode: "missing" };
  }

  validateHeadings(findings, requiredPaths.spec, "DEV active spec", ["Goal", "In Scope", "Out Of Scope", "Acceptance", "Verification Plan", "Status"]);
  const content = readUtf8(requiredPaths.spec);

  if (strict) {
    for (const heading of ["Goal", "In Scope", "Acceptance", "Verification Plan"]) {
      if (!hasMeaningfulSectionContent(content, heading)) {
        addFinding(
          findings,
          "error",
          `DEV active spec has no substantive \`## ${heading}\` content in ${requiredPaths.spec}`,
          `Fill the \`## ${heading}\` section in \`DEV/SPECS/ACTIVE.md\`.`
        );
      }
    }
  }

  const phaseState = parsePhaseState(content);
  if (phaseState.mode === "legacy") {
    return phaseState;
  }

  if (!phaseState.phase || isPlaceholderValue(phaseState.phase)) {
    addFinding(
      findings,
      "error",
      `DEV active spec has structured state without a valid \`Phase:\` in ${requiredPaths.spec}`,
      "Set `- Phase: discuss|plan|execute|verify|ship|handoff` under `DEV/SPECS/ACTIVE.md > ## Status`, or remove the partial structured state to stay in legacy mode."
    );
  } else if (!STANDARD_PHASES.has(phaseState.phase.toLowerCase())) {
    addFinding(
      findings,
      "error",
      `DEV active spec uses unknown phase \`${phaseState.phase}\` in ${requiredPaths.spec}`,
      "Use one of the standard phases: `discuss`, `plan`, `execute`, `verify`, `ship` or `handoff`."
    );
  }

  if (phaseState.status && isPlaceholderValue(phaseState.status)) {
    addFinding(
      findings,
      "error",
      `DEV active spec has placeholder \`Status:\` in ${requiredPaths.spec}`,
      "Replace the `Status:` placeholder with the current task status."
    );
  }

  if (!phaseState.status) {
    addFinding(
      warnings,
      "warning",
      `DEV active spec is missing \`Status:\` in structured state: ${requiredPaths.spec}`,
      "Add `- Status:` under `DEV/SPECS/ACTIVE.md > ## Status` to make the current state explicit."
    );
  }

  if (!phaseState.nextGate) {
    addFinding(
      warnings,
      "warning",
      `DEV active spec is missing \`Next gate:\` in structured state: ${requiredPaths.spec}`,
      "Add `- Next gate:` under `DEV/SPECS/ACTIVE.md > ## Status` so the next verification or handoff step is explicit."
    );
  } else if (isPlaceholderValue(phaseState.nextGate)) {
    addFinding(
      findings,
      "error",
      `DEV active spec has placeholder \`Next gate:\` in ${requiredPaths.spec}`,
      "Replace the `Next gate:` placeholder with the next concrete gate."
    );
  }

  if (!phaseState.startedAt) {
    addFinding(
      warnings,
      "warning",
      `DEV active spec is missing \`Started at:\` in structured state: ${requiredPaths.spec}`,
      "Add `- Started at: YYYY-MM-DD` under `DEV/SPECS/ACTIVE.md > ## Status` to track when the current phase started."
    );
  } else if (!isIsoLikeTimestamp(phaseState.startedAt)) {
    addFinding(
      findings,
      "error",
      `DEV active spec has non-ISO \`Started at:\` value \`${phaseState.startedAt}\` in ${requiredPaths.spec}`,
      "Use an ISO-like date such as `2026-08-07` or `2026-08-07T10:30:00Z` for `Started at:`."
    );
  }

  return phaseState;
}

function validateWorklog(findings, warnings, requiredPaths, strict, maxEntries) {
  if (!fs.existsSync(requiredPaths.worklog)) {
    return [];
  }

  const entries = parseWorklog(readUtf8(requiredPaths.worklog));
  if (entries.length > maxEntries) {
    addFinding(
      findings,
      "error",
      `DEV worklog has ${entries.length} entries (> ${maxEntries}). Run compact-worklog.`,
      `Run \`orquestrador-maestro compact-worklog --project-path ${path.dirname(requiredPaths.worklog).replace(/\\/g, "/")} --keep ${maxEntries}\`.`
    );
  }

  if (entries.length === 0) {
    addFinding(
      strict ? findings : warnings,
      strict ? "error" : "warning",
      "DEV worklog has no substantive entry yet.",
      "Add at least one compact entry to `DEV/WORKLOG.md` after substantive work."
    );
    return entries;
  }

  const latestEntry = entries[entries.length - 1];
  for (const bullet of ["Spec", "Changed", "Verified", "Next context"]) {
    const value = extractBullet(latestEntry.raw, bullet);
    if (!value) {
      addFinding(
        strict ? findings : warnings,
        strict ? "error" : "warning",
        `Latest worklog entry is missing \`${bullet}:\` in ${requiredPaths.worklog}`,
        `Add \`${bullet}:\` to the latest \`DEV/WORKLOG.md\` entry.`
      );
    }
  }

  return entries;
}

function uniqueActions(findings) {
  return [...new Set(findings.map((finding) => finding.action).filter(Boolean))];
}

function evaluateDevGates(options = {}) {
  const { projectRoot, devRoot } = resolveDevRoot(options.projectPath);
  const strict = Boolean(options.strict);
  const maxEntries = ensureInteger(options.maxEntries, "Max entries", DEFAULT_MAX_ENTRIES);
  const requiredPaths = buildRequiredPaths(devRoot);
  const errors = [];
  const warnings = [];

  validateRequiredFiles(errors, requiredPaths, projectRoot);
  validateIndex(errors, requiredPaths);
  validateHandoff(errors, requiredPaths, strict);
  validateContext(errors, requiredPaths);
  validateVerify(errors, requiredPaths, strict);
  const phaseState = validateSpec(errors, warnings, requiredPaths, strict);
  const worklogEntries = validateWorklog(errors, warnings, requiredPaths, strict, maxEntries);

  return {
    ok: errors.length === 0,
    strict,
    projectRoot,
    devRoot,
    maxEntries,
    worklogEntries: worklogEntries.length,
    phaseState,
    errors,
    warnings,
    actions: uniqueActions([...errors, ...warnings])
  };
}

function printReport(result, stdout = console.log, stderr = console.error) {
  if (!result.ok) {
    stderr("DEV gates failed.");
    for (const finding of result.errors) {
      stderr(`- ${finding.message}`);
    }
    if (result.warnings.length > 0) {
      stderr("Warnings:");
      for (const finding of result.warnings) {
        stderr(`- ${finding.message}`);
      }
    }
    if (result.actions.length > 0) {
      stderr("Corrective actions:");
      for (const action of result.actions) {
        stderr(`- ${action}`);
      }
    }
    return;
  }

  stdout("DEV gates passed.");
  stdout(`ProjectPath: ${result.projectRoot}`);
  stdout(`DevPath: ${result.devRoot}`);
  stdout(`Strict: ${result.strict}`);
  stdout(`WorklogEntries: ${result.worklogEntries}`);
  stdout(`MaxEntries: ${result.maxEntries}`);
  stdout(`StateMode: ${result.phaseState.mode}`);
  if (result.phaseState.phase) {
    stdout(`Phase: ${result.phaseState.phase}`);
  }
  if (result.phaseState.status) {
    stdout(`Status: ${result.phaseState.status}`);
  }
  if (result.phaseState.nextGate) {
    stdout(`NextGate: ${result.phaseState.nextGate}`);
  }
  if (result.phaseState.startedAt) {
    stdout(`StartedAt: ${result.phaseState.startedAt}`);
  }
  if (result.warnings.length > 0) {
    stdout("Warnings:");
    for (const finding of result.warnings) {
      stdout(`- ${finding.message}`);
    }
  }
  if (result.actions.length > 0) {
    stdout("Suggested actions:");
    for (const action of result.actions) {
      stdout(`- ${action}`);
    }
  }
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const result = evaluateDevGates(options);
  printReport(result);
  return result.ok ? 0 : 1;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_MAX_ENTRIES,
  STANDARD_PHASES,
  evaluateDevGates,
  main,
  parseArgs,
  parsePhaseState
};

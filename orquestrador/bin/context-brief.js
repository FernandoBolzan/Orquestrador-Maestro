#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MAX_CHARS = 16000;
const MAX_MAX_CHARS = 64000;
const COMPACT_FILES = [
  "DEV/README.md",
  "DEV/INDEX.md",
  "DEV/HANDOFF.md",
  "DEV/CONTEXT.md",
  "DEV/SPECS/ACTIVE.md",
  "DEV/VERIFY.md"
];
const EXCLUDED_SEGMENTS = new Set([".git", ".omx", "backups", "cache", "caches", "logs", "node_modules", "tmp"]);
const EXCLUDED_NAMES = new Set([".env", "memoria.md", "memory.md", "WORKLOG.md"]);
const TASK_DETAIL_ROOTS = ["DEV/SPECS", "DEV/TASKS", "DEV/WORKFLOWS", "DEV/RESEARCH"];

function printHelp() {
  console.log(`Briefing de contexto do Orquestrador Maestro

Uso:
  node context-brief.js [brief] [opções]

Opções:
  --project-path PATH   Projeto a reidratar (padrão: diretório atual)
  --task TEXTO          Intenção do Maestro para priorizar documentos
  --max-chars N         Limite total do briefing (padrão: ${DEFAULT_MAX_CHARS})
  --json                Retorna metadados e conteúdo em JSON
  --help                Exibe esta ajuda
`);
}

function parseArgs(argv) {
  const options = { projectPath: process.cwd(), task: "", maxChars: DEFAULT_MAX_CHARS, json: false };
  const args = [...argv];
  if (args[0] === "brief") args.shift();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") { options.help = true; continue; }
    if (arg === "--json") { options.json = true; continue; }
    const next = args[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`A opção ${arg} exige um valor.`);
    if (arg === "--project-path") options.projectPath = next;
    else if (arg === "--task") options.task = next;
    else if (arg === "--max-chars") {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isInteger(parsed) || parsed < 1000 || parsed > MAX_MAX_CHARS) {
        throw new Error(`--max-chars deve ser um inteiro entre 1000 e ${MAX_MAX_CHARS}.`);
      }
      options.maxChars = parsed;
    } else throw new Error(`Parâmetro desconhecido: ${arg}`);
    index += 1;
  }
  return options;
}

function readUtf8(filePath) {
  return sanitizeContent(fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").trim());
}

function sanitizeContent(content) {
  return content
    .replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)\s*[:=]\s*[^\s`"']+/giu, "$1=[redigido]")
    .replace(/(?:[A-Za-z]:[\\/]|\/Users\/|\/home\/|\/root\/)[^\s`"']+/gu, "[caminho local redigido]");
}

function isSafeRegularFile(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function findNearestFile(projectRoot, fileName) {
  const candidate = path.join(path.resolve(projectRoot), fileName);
  return isSafeRegularFile(candidate) ? candidate : null;
}

function tokenize(value) {
  return String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/u).filter((token) => token.length >= 3);
}

function relativePath(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, "/");
}

function isExcluded(relative) {
  const segments = relative.split("/");
  return segments.some((segment) => EXCLUDED_SEGMENTS.has(segment)) || EXCLUDED_NAMES.has(path.basename(relative));
}

function collectMarkdownFiles(root) {
  if (!fs.existsSync(root) || fs.lstatSync(root).isSymbolicLink()) return [];
  const result = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      const relative = path.relative(root, fullPath).replace(/\\/g, "/");
      if (isExcluded(relative)) continue;
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) result.push(fullPath);
    }
  }
  return result.sort();
}

function collectTaskDetailFiles(projectRoot) {
  const files = [];
  for (const relativeRoot of TASK_DETAIL_ROOTS) {
    files.push(...collectMarkdownFiles(path.join(projectRoot, relativeRoot)));
  }
  return files;
}

function scoreFile(relative, taskTokens) {
  const fileTokens = tokenize(relative);
  return taskTokens.reduce((score, token) => score + (fileTokens.includes(token) ? 3 : 0), 0);
}

function truncate(content, maxChars) {
  if (content.length <= maxChars) return content;
  const marker = "\n\n[conteúdo reduzido para preservar o orçamento de contexto]";
  return `${content.slice(0, Math.max(0, maxChars - marker.length))}${marker}`;
}

function buildCandidates(projectRoot, task) {
  const candidates = [];
  const seen = new Set();
  const add = (filePath, priority, reason) => {
    if (!filePath || seen.has(filePath) || !isSafeRegularFile(filePath)) return;
    seen.add(filePath);
    candidates.push({ filePath, priority, reason });
  };
  add(findNearestFile(projectRoot, "AGENTS.md"), 100, "contrato do projeto");
  for (const relative of COMPACT_FILES) add(path.join(projectRoot, relative), 80, "memória operacional compacta");
  const taskTokens = tokenize(task);
  if (taskTokens.length > 0) {
    for (const filePath of collectTaskDetailFiles(projectRoot)) {
      const relative = relativePath(projectRoot, filePath);
      const score = scoreFile(relative, taskTokens);
      if (score > 0) add(filePath, 20 + score, "documento relacionado à intenção");
    }
  }
  return candidates.sort((left, right) => right.priority - left.priority || left.filePath.localeCompare(right.filePath));
}

function buildBrief(options) {
  const projectRoot = path.resolve(options.projectPath);
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) throw new Error(`Projeto não encontrado: ${projectRoot}`);
  const candidates = buildCandidates(projectRoot, options.task);
  const sections = [];
  const included = [];
  const header = [
    "# Briefing de contexto do Orquestrador",
    "Projeto: [contexto local redigido]",
    options.task ? `Intenção do Maestro: ${options.task}` : "Intenção do Maestro: não informada",
    `Orçamento: ${options.maxChars} caracteres; usado: ${options.maxChars}`
  ].join("\n");
  let remaining = Math.max(0, options.maxChars - header.length - 2);
  for (const candidate of candidates) {
    if (remaining <= 0) break;
    const content = readUtf8(candidate.filePath);
    if (!content) continue;
    const heading = relativePath(projectRoot, candidate.filePath);
    const section = `## ${heading}\n\n${truncate(content, remaining)}`;
    const separator = sections.length > 0 ? "\n\n" : "";
    const available = remaining - separator.length;
    if (available <= 0) break;
    const output = truncate(section, available);
    sections.push(output);
    included.push({ path: heading, reason: candidate.reason, chars: output.length });
    remaining -= separator.length + output.length;
  }
  const used = options.maxChars - remaining;
  const finalHeader = header.replace(`usado: ${options.maxChars}`, `usado: ${used}`);
  const content = `${finalHeader}\n\n${sections.join("\n\n")}`.trim();
  return { projectRoot: "[redigido]", task: options.task, budget: options.maxChars, used: content.length, files: included, omitted: candidates.length - included.length, content };
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) { printHelp(); return 0; }
  const brief = buildBrief(options);
  console.log(options.json ? JSON.stringify(brief, null, 2) : brief.content);
  return 0;
}

if (require.main === module) {
  try { process.exitCode = main(); } catch (error) { console.error(`Erro: ${error.message}`); process.exitCode = 1; }
}

module.exports = { DEFAULT_MAX_CHARS, buildBrief, main, parseArgs };

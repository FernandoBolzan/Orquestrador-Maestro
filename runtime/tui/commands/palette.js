"use strict";

const { searchSkills } = require("../skills/search");

const PREFIXES = Object.freeze({ p: "project", m: "mission", t: "task", a: "agent", s: "skill", c: "command" });
const DOMAIN_KINDS = Object.freeze({ projects: "project", missions: "mission", tasks: "task", agents: "agent", skills: "skill" });

function words(value) {
  return String(value || "").toLocaleLowerCase("pt-BR").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function score(query, candidate) {
  const needle = words(query);
  const haystack = words(candidate);
  if (!needle.length || !haystack.length) return 0;
  if (query.length < 3) return haystack.some((word) => word.startsWith(query.toLocaleLowerCase("pt-BR"))) ? 1 : 0;
  let total = 0;
  for (const token of needle) {
    let best = 0;
    for (const word of haystack) {
      if (word === token) best = Math.max(best, 1);
      else if (word.startsWith(token)) best = Math.max(best, 1);
      else if (token.startsWith(word)) best = Math.max(best, 0.85);
      else if (word.includes(token) || token.includes(word)) best = Math.max(best, 0.65);
    }
    total += best;
  }
  return total / needle.length;
}

function parseQuery(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^>([pmtasc])(?:\s+|$)/i);
  return { query: match ? raw.slice(match[0].length).trim() : raw, kind: match ? PREFIXES[match[1].toLowerCase()] : null };
}

function paletteModel({ query, domains = {}, ctx, state }) {
  const parsed = parseQuery(query);
  if (!parsed.query) return { results: [], selected: -1 };
  const results = [];
  const registry = domains.commands;
  if ((!parsed.kind || parsed.kind === "command") && registry) {
    for (const command of registry.available(ctx, state)) {
      const rank = score(parsed.query, [command.id, command.title, command.category, ...(command.keywords || [])].join(" "));
      if (rank > 0) results.push({ kind: "command", id: command.id, title: command.title, category: command.category, score: rank });
    }
  }
  for (const [domain, kind] of Object.entries(DOMAIN_KINDS)) {
    if (parsed.kind && parsed.kind !== kind) continue;
    const items = domains[domain] || [];
    const skillRanks = kind === "skill" && parsed.query.length >= 3
      ? new Map(searchSkills(items, parsed.query).results.map((result) => [result.index, Math.min(1, result.score)]))
      : new Map();
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const title = item.title || item.displayName || item.id;
      const rank = Math.max(skillRanks.get(index) || 0, score(parsed.query, [item.id, title, item.displayName, item.description, item.category, ...(item.triggers || []), ...(item.aliases || [])].join(" ")));
      if (rank > 0) results.push({ kind, id: item.id, title, category: item.category || kind, score: rank });
    }
  }
  results.sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  return { results, selected: results.length ? 0 : -1 };
}

function selectResult(result, { registry, ctx } = {}) {
  if (!result) return null;
  if (result.kind === "command") return registry.execute(result.id, ctx);
  return { type: "palette.select", kind: result.kind, id: result.id };
}

module.exports = { paletteModel, selectResult };

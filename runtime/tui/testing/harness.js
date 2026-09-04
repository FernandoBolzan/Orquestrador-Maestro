"use strict";

const fs = require("node:fs");
const path = require("node:path");

const FIXTURE_ROOT = path.join(__dirname, "fixtures");
const FIXTURES = Object.freeze({
  skills: "skills/manifest-subset.json",
  attention: "attention/lifecycle.json",
  terminal: "terminal/session.json",
  ptyStream: "terminal/pty-stream.json",
  eventsSnapshot: "events/stream-snapshot.json",
  eventsDelta: "events/stream-delta.json",
  eventsGap: "events/stream-gap.json",
  eventsReconnect: "events/stream-reconnect.json",
  projectSnapshot: "project-snapshots/f7-project.json"
});

function fixture(name) {
  const relative = FIXTURES[name] || name;
  if (typeof relative !== "string" || path.isAbsolute(relative) || relative.split(/[\\/]/u).includes("..")) {
    throw new Error(`Invalid fixture path: ${String(relative)}`);
  }
  const file = path.join(FIXTURE_ROOT, relative);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function busy(state) {
  const map = state && state.ui && state.ui.busy;
  return Boolean(map && Object.values(map).some(Boolean));
}

async function runToQuiescence(state, act, { timeoutMs = 1000, pollMs = 1 } = {}) {
  const result = await act(state);
  const started = Date.now();
  while (busy(state)) {
    if (Date.now() - started >= timeoutMs) throw new Error(`UI quiescence timeout after ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  return result;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function golden(actual) { return JSON.stringify(canonical(actual)); }

function validateProjectSnapshot(value) {
  if (!value || typeof value !== "object") throw new Error("snapshot must be an object");
  for (const field of ["projectId", "epoch", "seq", "missions", "tasks", "agents", "skills", "attention"]) {
    if (!Object.hasOwn(value, field)) throw new Error(`snapshot missing required field: ${field}`);
  }
  if (!Number.isInteger(value.seq) || value.seq < 0) throw new Error("snapshot seq must be a non-negative integer");
  for (const field of ["missions", "tasks", "agents", "skills", "attention"]) {
    if (!Array.isArray(value[field])) throw new Error(`snapshot ${field} must be an array`);
  }
  return true;
}

module.exports = { FIXTURES, fixture, golden, runToQuiescence, validateProjectSnapshot };

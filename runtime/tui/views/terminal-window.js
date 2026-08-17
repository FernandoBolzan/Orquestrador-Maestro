"use strict";

function elapsed(startedAt, clock = Date) {
  const started = Date.parse(startedAt);
  const current = typeof clock.now === "function" ? clock.now() : Date.now();
  const seconds = Number.isFinite(started) ? Math.max(0, Math.floor((current - started) / 1_000)) : 0;
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return `${hours > 0 ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function streamLines(chunks) {
  const text = (Array.isArray(chunks) ? chunks : []).map((chunk) => typeof chunk === "string" ? chunk : chunk?.chunk ?? chunk?.data ?? "").join("");
  const lines = text.split(/\r?\n/u);
  if (lines.at(-1) === "") lines.pop();
  return Object.freeze(lines);
}

function renderWindow(terminal = {}, { clock = Date } = {}) {
  const header = Object.freeze({
    agent: String(terminal.agent || "agent"), provider: String(terminal.providerId || "unknown"),
    task: String(terminal.taskId || "unassigned"), status: String(terminal.status || "unknown")
  });
  const footer = Object.freeze({
    elapsed: elapsed(terminal.startedAt, clock),
    inputMode: terminal.inputAttached === true ? "detach" : "attach",
    activity: terminal.verifyStatus ? `verify:${terminal.verifyStatus}` : String(terminal.status || "idle")
  });
  return Object.freeze({ header, footer, bodyLines: streamLines(terminal.chunks) });
}

module.exports = { elapsed, renderWindow };

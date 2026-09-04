"use strict";

function stripAnsi(value) { return value.replace(/\x1b\[[0-?]*[ -\/]*[@-~]/gu, "").replace(/\r/g, ""); }

async function runPtyE2E({ stream, steps = [], maxLines = 1000 } = {}) {
  if (process.env.ORQUESTRADOR_TUI_PTY_E2E !== "1") throw new Error("Set ORQUESTRADOR_TUI_PTY_E2E=1 to run the PTY E2E gate");
  await import("node-pty");
  const { Terminal } = require("@xterm/headless");
  const terminal = new Terminal({ cols: 80, rows: 24, allowProposedApi: true });
  let buffer = ""; let attached = true; let viewOpen = true;
  for (const event of stream) {
    if (event.type !== "agentSession.output") continue;
    buffer += event.data;
    await new Promise((resolve) => terminal.write(event.data, resolve));
  }
  for (const step of steps) {
    if (step.type === "resize") terminal.resize(step.columns, step.rows);
    if (step.type === "detach") attached = false;
    if (step.type === "attach") attached = true;
    if (step.type === "closeView") viewOpen = false;
  }
  const lines = stripAnsi(buffer).split("\n").slice(-maxLines);
  return {
    frame: lines.join("\n"), buffer, attached, viewOpen,
    dimensions: { columns: terminal.cols, rows: terminal.rows },
    search(term) { return lines.flatMap((line, index) => line.includes(term) ? [index] : []); }
  };
}

module.exports = { runPtyE2E };

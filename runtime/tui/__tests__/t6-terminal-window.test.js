"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { elapsed, renderWindow } = require("../views/terminal-window");

test("T6.1 renders terminal chrome while body contains only stream lines", () => {
  const terminal = {
    id: "run-1", agent: "Builder", providerId: "codex", taskId: "task-9",
    status: "running", startedAt: "2026-08-16T10:00:00.000Z", verifyStatus: "pending",
    inputAttached: true,
    chunks: [{ timestamp: 1, data: "installing\n" }, { timestamp: 2, data: "tests pass\nready" }],
    pid: 9876, workspacePath: "/private/workspace", branch: "secret-branch", changedFiles: ["token.txt"]
  };
  const view = renderWindow(terminal, { clock: { now: () => Date.parse("2026-08-16T10:01:05.000Z") } });

  assert.deepEqual(view.header, { agent: "Builder", provider: "codex", task: "task-9", status: "running" });
  assert.deepEqual(view.footer, { elapsed: "01:05", inputMode: "detach", activity: "verify:pending" });
  assert.deepEqual(view.bodyLines, ["installing", "tests pass", "ready"]);
  const body = view.bodyLines.join("\n");
  for (const secret of ["9876", "/private/workspace", "secret-branch", "token.txt"]) assert.doesNotMatch(body, new RegExp(secret.replace(/[/.]/gu, "\\$&"), "u"));
  assert.equal(Object.isFrozen(view), true);
  assert.equal(Object.isFrozen(view.bodyLines), true);
});

test("T6.1 elapsed is monotonic with an injected manual clock", () => {
  let current = Date.parse("2026-08-16T10:00:01.000Z");
  const clock = { now: () => current };
  assert.equal(elapsed("2026-08-16T10:00:00.000Z", clock), "00:01");
  current += 60_000;
  assert.equal(elapsed("2026-08-16T10:00:00.000Z", clock), "01:01");
});

test("T6.1 consumes sequenced run.output chunks from the F8 bridge contract", () => {
  const view = renderWindow({
    agent: "Runner", providerId: "fake", taskId: "task-f8", status: "running",
    startedAt: "2026-08-16T10:00:00.000Z",
    chunks: [
      { runId: "run-f8", sequence: 1, chunk: "first\n" },
      { runId: "run-f8", sequence: 2, chunk: "second\n" }
    ]
  }, { clock: { now: () => Date.parse("2026-08-16T10:00:02.000Z") } });
  assert.deepEqual(view.bodyLines, ["first", "second"]);
});

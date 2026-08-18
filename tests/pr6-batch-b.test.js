"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { PassThrough } = require("node:stream");
const { spawnSync } = require("node:child_process");

const { parseCommandLine } = require("../runtime/shell/parse-command-line");
const { SocketBridgeClient } = require("../runtime/bridge/socket-client");
const { startSocketRuntime } = require("../runtime/bridge/socket-server");
const { shellQuote } = require("../runtime/terminals/session-manager");
const { ContextBudget } = require("../runtime/context/context-budget");

function tmpdir(t, prefix = "pr6-batch-b-") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function gitAvailable() {
  return spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0;
}

function initRepo(t, dir) {
  for (const args of [
    ["init", "-q", dir],
    ["config", "user.email", "t@t.t"], ["config", "user.name", "test"]
  ]) spawnSync("git", args, { cwd: dir, encoding: "utf8" });
}

test("parseCommandLine separa argumentos preservando aspas (#18)", () => {
  assert.deepEqual(parseCommandLine("node script.js --name \"Jane Doe\""), ["node", "script.js", "--name", "Jane Doe"]);
  assert.deepEqual(parseCommandLine("echo 'it'\\''s'"), ["echo", "it's"]);
  assert.deepEqual(parseCommandLine("npm run build   -- --prod"), ["npm", "run", "build", "--", "--prod"]);
  assert.deepEqual(parseCommandLine(""), []);
  assert.deepEqual(parseCommandLine("   "), []);
  assert.deepEqual(parseCommandLine("git log --format='%H %s'"), ["git", "log", "--format=%H %s"]);
  assert.throws(() => parseCommandLine("echo 'unterminated"), /unterminated quote/u);
});

test("shellQuote embrulha aspas simples sem quebrar o shell (#10)", () => {
  const quoted = shellQuote("it's fine");
  assert.equal(quoted, "'it'\\''s fine'");
  const result = spawnSync("sh", ["-c", `printf %s ${quoted}`], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "it's fine");
});

test("monitor.diff interpreta pares status-caminho em -z (#11)", { skip: !gitAvailable() }, (t) => {
  const dir = tmpdir(t);
  initRepo(t, dir);
  fs.writeFileSync(path.join(dir, "a.txt"), "one\n");
  fs.writeFileSync(path.join(dir, "b.txt"), "two\n");
  spawnSync("git", ["add", "-A"], { cwd: dir, encoding: "utf8" });
  spawnSync("git", ["commit", "-qm", "init"], { cwd: dir, encoding: "utf8" });
  fs.writeFileSync(path.join(dir, "a.txt"), "one edited\n");
  fs.unlinkSync(path.join(dir, "b.txt"));
  const { diff } = require("../runtime/git/monitor");
  const result = diff(dir);
  assert.equal(result.available, true);
  assert.deepEqual([...result.changedFiles].sort(), ["a.txt", "b.txt"]);
  assert.ok(result.changedFiles.every((file) => !/^[MADRCU?!]/u.test(file)), "status letters must not leak into paths");
});

test("socket-client rejeita quando o daemon morre sem responder (#9)", async (t) => {
  const dir = tmpdir(t);
  const socketPath = path.join(dir, "maestro.sock");
  const tokenPath = path.join(dir, "maestro.token");
  fs.writeFileSync(tokenPath, "sekret\n", { mode: 0o600 });
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      const line = chunk.toString().trim();
      if (line.includes("sekret")) { socket.write('{"ok":true}\n'); socket.destroy(); }
    });
  });
  await new Promise((resolve) => server.listen(socketPath, resolve));
  t.after(() => server.close());
  const client = new SocketBridgeClient({ projectRoot: dir });
  client.paths = { ...client.paths, socketPath, tokenPath };
  await assert.rejects(() => client.call("missions.list"), /Runtime Maestro indisponível/u);
});

test("socket-client rejeita resposta malformada (#9)", async (t) => {
  const dir = tmpdir(t);
  const socketPath = path.join(dir, "maestro.sock");
  const tokenPath = path.join(dir, "maestro.token");
  fs.writeFileSync(tokenPath, "sekret\n", { mode: 0o600 });
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8"); let authed = false;
    socket.on("data", (chunk) => {
      const line = chunk.toString().trim();
      if (!authed) { authed = line.includes("sekret"); if (authed) socket.write('{"ok":true}\n'); return; }
      socket.write("not-json\n");
    });
  });
  await new Promise((resolve) => server.listen(socketPath, resolve));
  t.after(() => server.close());
  const client = new SocketBridgeClient({ projectRoot: dir });
  client.paths = { ...client.paths, socketPath, tokenPath };
  await assert.rejects(() => client.call("missions.list"), /resposta malformada do daemon/u);
});

test("socket-client normaliza error string do daemon (#9)", async (t) => {
  const dir = tmpdir(t);
  const socketPath = path.join(dir, "maestro.sock");
  const tokenPath = path.join(dir, "maestro.token");
  fs.writeFileSync(tokenPath, "sekret\n", { mode: 0o600 });
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8"); let authed = false; let req = 0;
    socket.on("data", (chunk) => {
      const line = chunk.toString().trim();
      if (!authed && line.includes("sekret")) { authed = true; socket.write('{"ok":true}\n'); return; }
      if (!authed) return;
      req += 1;
      socket.write(`${JSON.stringify({ jsonrpc: "2.0", id: req, error: "invalid_request" })}\n`);
      socket.end();
    });
  });
  await new Promise((resolve) => server.listen(socketPath, resolve));
  t.after(() => server.close());
  const client = new SocketBridgeClient({ projectRoot: dir });
  client.paths = { ...client.paths, socketPath, tokenPath };
  const error = await client.call("missions.list").then(() => null, (value) => value);
  assert.ok(error instanceof Error);
  assert.equal(error.message, "invalid_request");
});

test("socket-client happy path e subscribe (#9)", async (t) => {
  const dir = tmpdir(t);
  const socketPath = path.join(dir, "maestro.sock");
  const tokenPath = path.join(dir, "maestro.token");
  fs.writeFileSync(tokenPath, "sekret\n", { mode: 0o600 });
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8"); let authed = false; let req = 0;
    socket.on("data", (chunk) => {
      const line = chunk.toString().trim();
      if (!authed && line.includes("sekret")) { authed = true; socket.write('{"ok":true}\n'); return; }
      if (!authed) return;
      req += 1;
      const message = JSON.parse(chunk.toString());
      if (message.method === "events.subscribe") {
        socket.write(`${JSON.stringify({ jsonrpc: "2.0", method: "maestro.event", params: { type: "ping" } })}\n`);
        socket.end();
      } else {
        socket.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { hello: "world" } })}\n`);
        socket.end();
      }
    });
  });
  await new Promise((resolve) => server.listen(socketPath, resolve));
  t.after(() => server.close());
  const client = new SocketBridgeClient({ projectRoot: dir });
  client.paths = { ...client.paths, socketPath, tokenPath };
  assert.deepEqual(await client.call("missions.list"), { hello: "world" });
  const events = [];
  const unsubscribe = client.subscribe((event) => events.push(event));
  await new Promise((resolve) => setTimeout(resolve, 120));
  unsubscribe();
  assert.equal(events[0]?.type, "ping");
  assert.equal(events.length, 2, "disconnect event expected after server closes");
  assert.equal(events[1]?.type, "runtime.disconnected");
});

test("WorkspaceManager removeSessionWorktree limpa worktree e registro git (#15)", { skip: !gitAvailable() }, async (t) => {
  const dir = tmpdir(t);
  initRepo(t, dir);
  fs.writeFileSync(path.join(dir, "seed.txt"), "seed\n");
  spawnSync("git", ["add", "-A"], { cwd: dir, encoding: "utf8" });
  spawnSync("git", ["commit", "-qm", "init"], { cwd: dir, encoding: "utf8" });
  const sessionRoot = path.join(dir, "runtime-worktrees");
  const { WorkspaceManager } = require("../runtime/workspaces/manager");
  const manager = new WorkspaceManager({ sessionRootDirectory: sessionRoot });
  const worktree = await manager.createSessionWorktree({ repositoryPath: dir, projectId: "proj-test", sessionId: "agent-session-abc123" });
  assert.ok(fs.existsSync(worktree.path));
  const before = spawnSync("git", ["worktree", "list"], { cwd: dir, encoding: "utf8" }).stdout;
  assert.ok(before.includes(worktree.path));
  const removed = await manager.removeSessionWorktree({ repositoryPath: dir, projectId: "proj-test", sessionId: "agent-session-abc123" });
  assert.equal(removed, true);
  assert.equal(fs.existsSync(worktree.path), false);
  const after = spawnSync("git", ["worktree", "list"], { cwd: dir, encoding: "utf8" }).stdout;
  assert.ok(!after.includes(worktree.path));
});

test("TUI classic preserva caixa dos argumentos (#19)", async (t) => {
  const input = new PassThrough();
  const output = new PassThrough();
  input.isTTY = true;
  output.isTTY = true;
  let chunks = "";
  output.on("data", (chunk) => { chunks += chunk; });
  const calls = [];
  const application = {
    projectRoot: "/projetos/repository/Orquestrador-Maestro",
    inspectProject: async () => ({ id: "p1", path: "/projetos/repository/Orquestrador-Maestro", status: "ready" }),
    listRuns: async () => [],
    skills: { list: async () => [] },
    listTerminalSessions: async () => [],
    terminalCapabilities: () => ({ backends: {}, tui: {} }),
    createTerminalSession: async (request) => { calls.push(request); return { id: "s1", ...request }; }
  };
  const { startTui } = require("../runtime/tui/index.js");
  const promise = startTui(application, { input, output, classic: true });
  input.write("A OpEnCoDe\n");
  input.write("h echo \"Hello World\"\n");
  input.write("q\n");
  input.end();
  const result = await promise;
  assert.equal(result.interactive, true);
  assert.deepEqual(calls, [
    { workspacePath: "/projetos/repository/Orquestrador-Maestro", kind: "agent", providerId: "OpEnCoDe", backend: "tmux" },
    { workspacePath: "/projetos/repository/Orquestrador-Maestro", kind: "shell", command: "echo", args: ["Hello World"], backend: "tmux" }
  ]);
});

test("ContextBudget estima custo de valores não-string sem lançar (#20)", () => {
  assert.equal(ContextBudget.estimateCost("abcdefgh"), 2);
  assert.equal(ContextBudget.estimateCost({ a: 1 }), 2);
  const circular = {}; circular.self = circular;
  assert.equal(ContextBudget.estimateCost(circular), 25);
  const items = [
    { key: "a", value: { payload: "x".repeat(400) }, kind: "fact", relevance: 0.5, confidence: 0.8 },
    { key: "b", value: "short", kind: "fact", relevance: 0.5, confidence: 0.8 }
  ];
  const budgeted = ContextBudget.applyBudget(items, 40);
  const kept = budgeted.map((item) => item.key);
  assert.ok(kept.includes("b"), "small string must fit under a tight budget");
  assert.ok(!kept.includes("a"), "large serialized object must be cut");
  assert.doesNotThrow(() => ContextBudget.applyBudget([{ key: "c", value: circular, kind: "fact" }]));
});

test("startSocketRuntime recusa segundo daemon com RUNTIME_ALREADY_RUNNING (#14)", async (t) => {
  const dir = tmpdir(t);
  const bridge = { handle: async () => ({ ok: true }) };
  const first = startSocketRuntime(bridge, { projectRoot: dir });
  await first.ready;
  t.after(async () => { await first.close(); });
  assert.throws(() => startSocketRuntime(bridge, { projectRoot: dir }), (error) => error.code === "RUNTIME_ALREADY_RUNNING");
});

let ptyAvailable = false;
try { ptyAvailable = Boolean(require("node-pty")); } catch {}
const { PtySessionManager } = require("../runtime/terminals/pty-session-manager");

test("PtySessionManager close preserva status closed (#12)", { skip: !ptyAvailable }, async (t) => {
  const records = new Map();
  const store = {
    saveTerminal: async (record) => records.set(record.id, record),
    getTerminal: async (id) => records.get(id) || null,
    listTerminals: async () => [...records.values()]
  };
  const manager = new PtySessionManager({ store, ptyModule: require("node-pty") });
  const created = await manager.create({
    projectId: "p1", workspacePath: os.tmpdir(), command: process.execPath,
    args: ["-e", "setInterval(() => {}, 10000)"], sessionId: "agent-session-pty-close"
  });
  assert.equal(created.status, "active");
  await manager.close(created.id);
  await new Promise((resolve) => setTimeout(resolve, 400));
  const after = await manager.get(created.id);
  assert.equal(after.status, "closed");
});
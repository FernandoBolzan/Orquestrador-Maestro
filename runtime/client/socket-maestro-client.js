"use strict";

const crypto = require("node:crypto");
const net = require("node:net");
const { WATCHDOG, decide } = require("../events/reconnect-strategy");
const { PROTOCOL_VERSION } = require("../protocol/protocol-v2");
const { MAESTRO_CLIENT_INTERFACE, MaestroClientError } = require("./maestro-client");

class SocketMaestroClient {
  constructor(options = {}) {
    if (!options.socketPath && !(options.host && options.port)) throw new TypeError("socketPath or host/port is required");
    this.options = options; this.socket = null; this.buffer = ""; this.phase = "offline"; this.epoch = null;
    this.listeners = new Set(); this.stateListeners = new Set(); this.pending = new Map(); this.eventBuffer = [];
    this.droppedCount = 0; this.cursor = {}; this.closed = false; this.reconnectAttempt = 0; this.watchdogEnabled = options.watchdog !== false;
    this.currentSnapshot = null;
    this.lastPongAt = 0; this.missedPings = 0; this.timer = null; this.requestTimeoutMs = options.requestTimeoutMs || 10000;
  }

  _state(phase) { this.phase = phase; for (const listener of this.stateListeners) listener({ phase }); }
  onStateChange(listener) { this.stateListeners.add(listener); return () => this.stateListeners.delete(listener); }
  _connectionOptions() { return this.options.socketPath ? { path: this.options.socketPath } : { host: this.options.host, port: this.options.port }; }

  async connect() {
    if (this.closed) throw new MaestroClientError("CLIENT_DISCONNECTED", "Client is closed");
    if (this.socket && !this.socket.destroyed && this.phase === "connected") return this;
    const wasReconnecting = this.reconnectAttempt > 0;
    this._state(wasReconnecting ? "reconnecting" : "connecting");
    await new Promise((resolve, reject) => {
      const socket = this.options.createConnection ? this.options.createConnection(this._connectionOptions()) : net.createConnection(this._connectionOptions());
      this.socket = socket; socket.setEncoding("utf8");
      const onInitialError = (error) => reject(new MaestroClientError("CLIENT_DISCONNECTED", error.message));
      socket.once("error", onInitialError);
      socket.once("connect", () => { socket.off("error", onInitialError); socket.on("error", () => undefined); socket.on("data", (chunk) => this._onData(chunk)); socket.on("close", () => this._onClose()); resolve(); });
    });
    if (this.options.token) {
      const authenticated = await this._authenticate(this.options.token);
      if (!authenticated.ok) { this.socket.destroy(); throw new MaestroClientError("AUTH_FAILED", "Runtime authentication failed"); }
    }
    const ack = await this._request({ kind: "hello", protocolVersion: PROTOCOL_VERSION, clientId: this.options.clientId || `client-${process.pid}` }, ["hello.ack", "hello.error"]);
    if (ack.kind !== "hello.ack") { this.socket.destroy(); throw new MaestroClientError("PROTOCOL_MISMATCH", "Server rejected protocol v2", ack); }
    this.epoch = ack.epoch; this.reconnectAttempt = 0; if (!wasReconnecting) this.missedPings = 0; this.lastPongAt = Date.now(); this._state("connected");
    if (this.watchdogEnabled) {
      this._startWatchdog();
      if (wasReconnecting) this._write({ kind: "ping", ts: Date.now() });
    }
    return this;
  }
  initialize() { return this.connect(); }

  _write(message) {
    if (!this.socket || this.socket.destroyed || this.phase === "offline") throw new MaestroClientError("CLIENT_DISCONNECTED");
    this.socket.write(`${JSON.stringify(message)}\n`);
  }
  _request(message, responseKinds) {
    const key = message.kind === "action" ? `action:${message.requestId}` : message.kind;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(key); reject(new MaestroClientError("CLIENT_TIMEOUT", `Timeout waiting for ${message.kind}`)); }, this.requestTimeoutMs);
      timer.unref?.(); this.pending.set(key, { resolve, reject, timer, responseKinds });
      try { this._write(message); } catch (error) { clearTimeout(timer); this.pending.delete(key); reject(error); }
    });
  }
  _authenticate(token) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete("auth"); reject(new MaestroClientError("CLIENT_TIMEOUT", "Timeout waiting for authentication")); }, this.requestTimeoutMs);
      timer.unref?.(); this.pending.set("auth", { resolve, reject, timer, responseKinds: ["auth"] });
      this.socket.write(`${JSON.stringify({ token })}\n`);
    });
  }
  _resolve(message) {
    const key = message.requestId ? `action:${message.requestId}`
      : message.kind === "hello.ack" || message.kind === "hello.error" ? "hello"
        : message.kind === "snapshot" ? "snapshot.request"
          : message.kind === "resume.result" || message.kind === "resume.rejected" ? "resume"
            : message.kind === "streams.subscribed" ? "streams.subscribe"
              : message.kind === "streams.unsubscribed" ? "streams.unsubscribe" : null;
    const pending = key && this.pending.get(key);
    if (!pending || !pending.responseKinds.includes(message.kind)) return false;
    clearTimeout(pending.timer); this.pending.delete(key); pending.resolve(message); return true;
  }
  _onData(chunk) {
    this.buffer += chunk; let newline;
    while ((newline = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, newline); this.buffer = this.buffer.slice(newline + 1); if (!line.trim()) continue;
      let message; try { message = JSON.parse(line); } catch { continue; }
      if (typeof message.ok === "boolean" && !message.kind && this.pending.has("auth")) {
        const pending = this.pending.get("auth"); clearTimeout(pending.timer); this.pending.delete("auth"); pending.resolve(message); continue;
      }
      if (message.kind === "pong") { this.lastPongAt = Date.now(); this.missedPings = 0; continue; }
      if (message.kind === "event") { this.cursor[message.family] = Math.max(this.cursor[message.family] || 0, message.seq); this._deliver(message); continue; }
      this._resolve(message);
    }
  }
  _deliver(event) {
    if (this.listeners.size) { for (const listener of this.listeners) listener(event); return; }
    if (this.eventBuffer.length >= 1000) { this.eventBuffer.shift(); this.droppedCount += 1; }
    this.eventBuffer.push(event);
  }
  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("listener must be a function"); this.listeners.add(listener);
    while (this.eventBuffer.length) listener(this.eventBuffer.shift());
    return () => this.listeners.delete(listener);
  }
  async snapshot(streams) {
    const response = await this._request({ kind: "snapshot.request", ...(streams ? { streams } : {}) }, ["snapshot"]);
    this.epoch = response.epoch;
    for (const [family, events] of Object.entries(response.streams || {})) if (events.length) this.cursor[family] = events[events.length - 1].seq;
    this.currentSnapshot = response;
    return response;
  }
  async action(act) {
    if (this.phase !== "connected") throw new MaestroClientError("offline");
    const requestId = act?.requestId || crypto.randomUUID();
    const idempotencyKey = act?.idempotencyKey;
    const response = await this._request({
      kind: "action",
      requestId,
      type: act?.type,
      payload: act?.payload,
      ...(idempotencyKey ? { idempotencyKey } : {})
    }, ["action.validated", "action.rejected"]);
    if (!response.ok) throw new MaestroClientError(response.reason, response.reason, response);
    return response.result;
  }
  async health() { return { phase: this.phase, transport: "socket", epoch: this.epoch, droppedCount: this.droppedCount, missedPings: this.missedPings }; }

  _startWatchdog() {
    clearInterval(this.timer); this.timer = setInterval(() => {
      if (this.phase !== "connected") return; this.missedPings += 1;
      if (this.missedPings >= WATCHDOG.maxMisses) { this._state("offline"); this.socket?.destroy(); return; }
      if (this.missedPings >= WATCHDOG.reconnectAtMiss) { this.socket?.destroy(); return; }
      try { this._write({ kind: "ping", ts: Date.now() }); } catch { this._onClose(); }
    }, WATCHDOG.pingIntervalMs); this.timer.unref?.();
  }
  _onClose() {
    clearInterval(this.timer); this.timer = null; if (this.closed || this.phase === "offline") return;
    this._state("reconnecting"); this.reconnectAttempt += 1; const { waitMs } = decide({ missedPings: 1, attempt: this.reconnectAttempt, phase: "connected" });
    const timeout = setTimeout(async () => {
      try {
        await this.connect(); this._state("resnapshot"); await this.snapshot();
        this._state("resubscribe");
        if (this.listeners.size) await this._request({ kind: "streams.subscribe" }, ["streams.subscribed"]);
        this._state("heal");
        const healed = await this._request({ kind: "resume", epoch: this.epoch, cursor: this.cursor }, ["resume.result", "resume.rejected"]);
        if (healed.kind === "resume.result") for (const event of healed.events || []) this._deliver(event);
        this._state("connected");
      } catch {
        if (this.reconnectAttempt >= 3) this._state("offline"); else this._onClose();
      }
    }, waitMs); timeout.unref?.();
  }
  close() {
    this.closed = true; clearInterval(this.timer); this.socket?.destroy(); this._state("offline");
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new MaestroClientError("CLIENT_DISCONNECTED")); }
    this.pending.clear();
  }
}

const ACTION_TYPE_BY_METHOD = Object.freeze({
  inspectProject: "project.inspect", listProjects: "projects.list", getProject: "projects.get", registerProject: "projects.register",
  listMissions: "missions.list", getMission: "missions.get", createMission: "mission.create", updateMission: "mission.update",
  listRuns: "runs.list", getRun: "run.get", inspectRun: "run.inspect", createRun: "run.create", executeRun: "run.execute", cancelRun: "run.cancel",
  listTasks: "tasks.list", getTask: "task.get",
  listArtifacts: "artifacts.list", getArtifact: "artifacts.get", getVerification: "verification.get",
  listProviders: "providers.list", skillsList: "skills.list",
  listAttention: "attention.list", getAttention: "attention.get", createAttention: "attention.create", resolveAttention: "attention.resolve",
  listTerminalSessions: "terminals.list", createTerminalSession: "terminal.create", attachTerminalSession: "terminal.attach", closeTerminalSession: "terminal.close",
  focusTerminalSession: "terminal.focus", inputTerminalSession: "terminal.input", resizeTerminalSession: "terminal.resize", snapshotTerminalSession: "terminal.snapshot",
  startTerminal: "terminal.start", stopTerminal: "terminal.stop", waitTerminal: "terminal.wait",
  startIntentSession: "intentSession.start", updateIntentSession: "intentSession.update", approveMissionBrief: "missionBrief.approve"
});

for (const [name, type] of Object.entries(MAESTRO_CLIENT_INTERFACE)) {
  if (type !== "method" || SocketMaestroClient.prototype[name]) continue;
  SocketMaestroClient.prototype[name] = function forwarded(...args) {
    const payload = name === "cancelRun" ? { runId: args[0], run: args[1]?.run }
      : name === "inspectRun" || name === "getRun" ? { runId: args[0] }
      : name === "getMission" ? { missionId: args[0] }
      : name === "getProject" ? { projectId: args[0] }
      : name === "getTask" ? { taskId: args[0] }
      : name === "getArtifact" ? { artifactId: args[0] }
      : name === "getVerification" ? { runId: args[0] }
      : name === "getAttention" ? { attentionId: args[0] }
      : name === "resolveAttention" ? { attentionId: args[0], decision: args[1], ...(args[2] || {}) }
      : name === "updateMission" ? { missionId: args[0], ...(args[1] || {}) }
      : name === "updateIntentSession" ? { sessionId: args[0], ...(args[1] || {}) }
      : name === "approveMissionBrief" ? { sessionId: args[0], ...(args[1] || {}) }
      : ["closeTerminalSession", "attachTerminalSession", "focusTerminalSession", "stopTerminal", "waitTerminal"].includes(name) ? { terminalId: args[0] }
      : name === "inputTerminalSession" ? { terminalId: args[0], input: args[1] }
      : name === "resizeTerminalSession" ? { terminalId: args[0], columns: args[1], rows: args[2] }
      : name === "snapshotTerminalSession" ? { terminalId: args[0], afterSequence: typeof args[1] === "object" ? args[1]?.afterSequence : args[1] || 0 }
      : args[0] || {};
    return this.action({ type: ACTION_TYPE_BY_METHOD[name], payload });
  };
}

module.exports = { SocketMaestroClient };

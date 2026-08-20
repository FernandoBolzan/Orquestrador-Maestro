"use strict";

const { buildSnapshot } = require("../events/epoch-sequencer");
const { familyOf } = require("../events/event-families");

const METHOD_NAMES = [
  "initialize", "snapshot", "subscribe", "health", "action",
  "inspectProject", "listProjects", "getProject", "registerProject",
  "listMissions", "getMission", "createMission", "updateMission",
  "listRuns", "getRun", "inspectRun", "createRun", "executeRun", "cancelRun",
  "listTasks", "getTask",
  "listArtifacts", "getArtifact", "getVerification",
  "listProviders", "skillsList",
  "listAttention", "getAttention", "createAttention", "resolveAttention",
  "listTerminalSessions", "createTerminalSession", "attachTerminalSession",
  "closeTerminalSession", "focusTerminalSession", "inputTerminalSession",
  "resizeTerminalSession", "snapshotTerminalSession",
  "startTerminal", "stopTerminal", "waitTerminal",
  "startIntentSession", "updateIntentSession", "approveMissionBrief"
];

const MAESTRO_CLIENT_INTERFACE = Object.freeze(Object.fromEntries(METHOD_NAMES.map((name) => [name, "method"])));
const REJECTION_REASONS = Object.freeze([
  "gate.required", "not_running", "double_confirm", "invalid_payload", "offline",
  "deprecated", "fenced", "lease_expired", "stalled", "no_progress"
]);
const CLIENT_ERROR_CODES = Object.freeze([...REJECTION_REASONS, "CLIENT_DISCONNECTED", "CLIENT_TIMEOUT", "PROTOCOL_MISMATCH", "AUTH_FAILED"]);

class MaestroClientError extends Error {
  constructor(reason, message, details) {
    if (!CLIENT_ERROR_CODES.includes(reason)) throw new TypeError(`Unknown MaestroClientError reason: ${reason}`);
    super(message || reason); this.name = "MaestroClientError"; this.reason = reason; this.code = reason; this.details = details;
  }
}

function predictAvailability(input = {}) {
  const type = input.type || input.action;
  if (typeof type !== "string") return { available: false, reason: "invalid_payload" };
  if (["run.stop", "run.cancel"].includes(type) && input.run?.status !== "running") return { available: false, reason: "not_running" };
  if (type === "mission.cancel" && input.confirm !== "destructive") return { available: false, reason: "double_confirm" };
  if (["attention.resolve", "gate.decide"].includes(type) && !["pending", "open", "requested"].includes(input.attention?.status || input.gate?.status)) return { available: false, reason: "not_running" };
  return { available: true };
}

function wrapInvalid(error) {
  if (error instanceof MaestroClientError) return error;
  return new MaestroClientError("invalid_payload", error?.message || "Invalid action payload", { cause: error });
}

class LocalMaestroClient {
  constructor({ app, epoch = 1 } = {}) {
    if (!app?.store) throw new TypeError("app with store is required");
    this.app = app; this.store = app.store; this.epoch = epoch; this.closed = false;
  }
  async initialize() { await this.app.initialize?.(); return this; }
  async snapshot(streams) { return buildSnapshot({ store: this.store, epoch: this.epoch, streams }); }
  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("listener must be a function");
    return this.app.subscribe(async (legacy) => {
      try {
        const snapshot = await this.snapshot([familyOf(legacy.type)]);
        const entry = snapshot.streams[familyOf(legacy.type)].find((event) => event.payload.legacyId === legacy.id);
        if (entry) listener({ kind: "event", family: familyOf(entry.type), epoch: entry.epoch, seq: entry.seq, entry });
      } catch (error) { listener({ kind: "client.error", error: wrapInvalid(error) }); }
    });
  }
  async health() { return { phase: this.closed ? "offline" : "connected", transport: "local", epoch: this.epoch }; }
  inspectProject(...args) { return this.app.inspectProject(...args); }
  listProjects(...args) { return this.app.listProjects(...args); }
  getProject(...args) { return this.app.getProject(...args); }
  registerProject(...args) { return this.app.registerProject(...args); }
  listMissions(...args) { return this.app.listMissions(...args); }
  getMission(...args) { return this.app.getMission(...args); }
  createMission(...args) { return this.app.createMission(...args); }
  updateMission(...args) { return this.app.updateMission(...args); }
  listRuns(...args) { return this.app.listRuns(...args); }
  getRun(...args) { return this.app.getRun(...args); }
  inspectRun(...args) { return this.app.inspectRun(...args); }
  createRun(...args) { return this.app.createRun(...args); }
  executeRun(...args) { return this.app.executeRun(...args); }
  cancelRun(...args) { return this.app.cancelRun(...args); }
  listTasks(...args) { return this.app.listTasks(...args); }
  getTask(...args) { return this.app.getTask(...args); }
  listArtifacts(...args) { return this.app.listArtifacts(...args); }
  getArtifact(...args) { return this.app.getArtifact(...args); }
  getVerification(...args) { return this.app.getVerification(...args); }
  listProviders(...args) { return this.app.listProviders(...args); }
  async skillsList() { return typeof this.app.skills?.list === "function" ? this.app.skills.list() : []; }
  async listAttention(...args) { return this.app.attention?.list ? this.app.attention.list(...args) : this.app.store.listAttention(...args); }
  async getAttention(...args) { return this.app.attention?.get ? this.app.attention.get(...args) : this.app.store.getAttention(...args); }
  async createAttention(...args) { return this.app.attention?.add ? this.app.attention.add(...args) : this.app.store.saveAttention(...args); }
  async resolveAttention(id, decision, options = {}) {
    if (!this.app.attention?.resolve) throw new MaestroClientError("deprecated", "Attention runtime is unavailable");
    return this.app.attention.resolve(id, { decision, ...options });
  }
  listTerminalSessions(...args) { return this.app.listTerminalSessions(...args); }
  createTerminalSession(...args) { return this.app.createTerminalSession(...args); }
  attachTerminalSession(...args) { return this.app.attachTerminalSession(...args); }
  closeTerminalSession(...args) { return this.app.closeTerminalSession(...args); }
  focusTerminalSession(...args) { return this.app.focusTerminalSession(...args); }
  inputTerminalSession(...args) { return this.app.inputTerminalSession(...args); }
  resizeTerminalSession(...args) { return this.app.resizeTerminalSession(...args); }
  snapshotTerminalSession(...args) { return this.app.snapshotTerminalSession(...args); }
  startTerminal(...args) { return this.app.startTerminal(...args); }
  stopTerminal(...args) { return this.app.stopTerminal(...args); }
  waitTerminal(...args) { return this.app.waitTerminal(...args); }
  startIntentSession(...args) { return this.app.startIntentSession(...args); }
  updateIntentSession(...args) { return this.app.updateIntentSession(...args); }
  approveMissionBrief(...args) { return this.app.approveMissionBrief(...args); }
  async action(act) {
    if (!act || typeof act !== "object" || typeof act.type !== "string" || !act.payload || typeof act.payload !== "object") throw new MaestroClientError("invalid_payload");
    const availability = predictAvailability({ type: act.type, ...act.payload });
    if (!availability.available) throw new MaestroClientError(availability.reason);
    const payload = act.payload;
    try {
      switch (act.type) {
        case "mission.create": return this.createMission(payload);
        case "run.create": return this.createRun(payload);
        case "run.execute": return this.executeRun(payload);
        case "run.cancel": case "run.stop": return this.cancelRun(payload.runId);
        case "terminal.create": return this.createTerminalSession(payload);
        case "terminal.close": return this.closeTerminalSession(payload.terminalId);
        case "attention.resolve": return this.resolveAttention(payload.attentionId, payload.decision, payload);
        default: throw new MaestroClientError("deprecated", `Unsupported action: ${act.type}`);
      }
    } catch (error) { throw wrapInvalid(error); }
  }
}

module.exports = { CLIENT_ERROR_CODES, LocalMaestroClient, MAESTRO_CLIENT_INTERFACE, MaestroClientError, REJECTION_REASONS, predictAvailability };

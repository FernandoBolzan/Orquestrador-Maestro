"use strict";

const { buildSnapshot, eventsSince } = require("../events/epoch-sequencer");
const { familyOf } = require("../events/event-families");
const { IdempotencyManager } = require("./idempotency");

const PROTOCOL_VERSION = 2;
const REJECTION_REASONS = new Set([
  "gate.required", "not_running", "double_confirm", "offline", "invalid_payload",
  "deprecated", "fenced", "lease_expired", "stalled", "no_progress", "unknown"
]);

function protocolMismatchError(supported = [PROTOCOL_VERSION]) {
  const error = new Error(`Unsupported Maestro protocol version; supported: ${supported.join(", ")}`);
  error.code = "PROTOCOL_MISMATCH";
  error.supportedProtocolVersions = [...supported];
  return error;
}

function parseLine(line) {
  if (typeof line !== "string") throw new TypeError("Protocol line must be a string");
  const message = JSON.parse(line);
  if (!message || typeof message !== "object" || Array.isArray(message) || typeof message.kind !== "string") throw new TypeError("Protocol message.kind is required");
  return message;
}

function createProtocolV2Server({ runtime, store = runtime?.store, epoch = 1, serverInfo = {}, idempotencyManager = new IdempotencyManager() } = {}) {
  if (!store || typeof store.listEvents !== "function") throw new TypeError("A runtime store is required");
  const listeners = new Set();
  let closed = false;
  let subscriptions = null;
  let delivery = Promise.resolve();

  const unsubscribeRuntime = typeof runtime?.subscribe === "function" ? runtime.subscribe((legacy) => {
    delivery = delivery.then(async () => {
      if (closed) return;
      const snapshot = await buildSnapshot({ store, epoch });
      const family = familyOf(legacy.type);
      if (subscriptions && !subscriptions.has(family)) return;
      const entry = snapshot.streams[family]?.find((event) => event.payload.legacyId === legacy.id);
      if (!entry) return;
      const frame = Object.freeze({ kind: "event", seq: entry.seq, epoch, family, entry });
      for (const listener of listeners) listener(frame);
    }).catch(() => undefined);
  }) : null;

  async function snapshot(streams) {
    const result = await buildSnapshot({ store, epoch, streams });
    return { kind: "snapshot", ...result };
  }

  async function performAction(message) {
    if (typeof runtime?.action === "function") {
      return runtime.action({ type: message.type, payload: message.payload, requestId: message.requestId, idempotencyKey: message.idempotencyKey });
    }

    const methodByType = {
      "project.inspect": "inspectProject", "projects.list": "listProjects", "projects.register": "registerProject", "projects.get": "getProject",
      "missions.list": "listMissions", "missions.get": "getMission", "mission.create": "createMission", "mission.update": "updateMission",
      "runs.list": "listRuns", "run.create": "createRun", "run.execute": "executeRun", "run.cancel": "cancelRun", "run.inspect": "inspectRun", "runs.inspect": "inspectRun", "run.get": "getRun",
      "tasks.list": "listTasks", "task.get": "getTask",
      "artifacts.list": "listArtifacts", "artifacts.get": "getArtifact", "verification.get": "getVerification",
      "providers.list": "listProviders",
      "terminals.list": "listTerminalSessions", "terminal.create": "createTerminalSession",
      "terminal.close": "closeTerminalSession", "terminal.attach": "attachTerminalSession", "terminal.focus": "focusTerminalSession",
      "terminal.input": "inputTerminalSession", "terminal.resize": "resizeTerminalSession", "terminal.snapshot": "snapshotTerminalSession",
      "terminal.start": "startTerminal", "terminal.stop": "stopTerminal", "terminal.wait": "waitTerminal",
      "intentSession.start": "startIntentSession", "intentSession.update": "updateIntentSession", "missionBrief.approve": "approveMissionBrief"
    };

    if (message.type === "skills.list" && typeof runtime?.skills?.list === "function") {
      return runtime.skills.list();
    }
    if (message.type === "attention.list") {
      return runtime?.attention?.list ? runtime.attention.list(message.payload) : store.listAttention(message.payload);
    }
    if (message.type === "attention.get") {
      return runtime?.attention?.get ? runtime.attention.get(message.payload?.id || message.payload?.attentionId) : store.getAttention(message.payload?.id || message.payload?.attentionId);
    }
    if (message.type === "attention.create" && typeof runtime?.attention?.add === "function") {
      return runtime.attention.add(message.payload);
    }
    if (message.type === "attention.resolve" && typeof runtime?.attention?.resolve === "function") {
      const { attentionId, decision, ...options } = message.payload;
      return runtime.attention.resolve(attentionId, { decision, ...options });
    }

    const method = methodByType[message.type];
    if (!method || typeof runtime?.[method] !== "function") {
      throw Object.assign(new Error(`Action ${message.type} is not supported`), { reason: "deprecated" });
    }

    if (message.type === "mission.update") {
      const { missionId, ...patch } = message.payload;
      return runtime[method](missionId, patch);
    }
    if (message.type === "intentSession.update") {
      const { sessionId, ...updates } = message.payload;
      return runtime[method](sessionId, updates);
    }
    if (message.type === "missionBrief.approve") {
      const { sessionId, ...briefInput } = message.payload;
      return runtime[method](sessionId, briefInput);
    }
    if (["run.cancel", "run.inspect", "run.get"].includes(message.type)) {
      return runtime[method](message.payload.runId || message.payload.id);
    }
    if (["missions.get"].includes(message.type)) {
      return runtime[method](message.payload.missionId || message.payload.id);
    }
    if (["projects.get"].includes(message.type)) {
      return runtime[method](message.payload.projectId || message.payload.id);
    }
    if (["task.get"].includes(message.type)) {
      return runtime[method](message.payload.taskId || message.payload.id);
    }
    if (["terminal.close", "terminal.attach", "terminal.focus", "terminal.stop", "terminal.wait"].includes(message.type)) {
      return runtime[method](message.payload.terminalId || message.payload.id);
    }
    if (message.type === "terminal.input") {
      return runtime[method](message.payload.terminalId || message.payload.id, message.payload.input);
    }
    if (message.type === "terminal.resize") {
      return runtime[method](message.payload.terminalId || message.payload.id, message.payload.columns, message.payload.rows);
    }
    if (message.type === "terminal.snapshot") {
      return runtime[method](message.payload.terminalId || message.payload.id, message.payload.afterSequence || 0);
    }

    return runtime[method](message.payload);
  }

  async function action(message) {
    if (!message.requestId || typeof message.type !== "string" || !message.payload || typeof message.payload !== "object") {
      return { kind: "action.rejected", requestId: message.requestId, ok: false, reason: "invalid_payload" };
    }

    const idempotencyKey = message.idempotencyKey;
    try {
      const executionResult = await idempotencyManager.execute(idempotencyKey, async () => {
        const result = await performAction(message);
        return result;
      });

      const deduplicated = Boolean(executionResult?.deduplicated);
      const ok = executionResult?.ok !== false;
      const result = executionResult?.result !== undefined ? executionResult.result : executionResult;
      const reason = executionResult?.reason;

      if (!ok) {
        return {
          kind: "action.rejected",
          requestId: message.requestId,
          ...(idempotencyKey ? { idempotencyKey } : {}),
          ok: false,
          reason: REJECTION_REASONS.has(reason) ? reason : "invalid_payload",
          deduplicated
        };
      }

      return {
        kind: "action.validated",
        requestId: message.requestId,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        ok: true,
        result,
        deduplicated
      };
    } catch (error) {
      const reason = REJECTION_REASONS.has(error?.reason) ? error.reason : "invalid_payload";
      return {
        kind: "action.rejected",
        requestId: message.requestId,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        ok: false,
        reason,
        error: error.message
      };
    }
  }

  async function handleLine(line) {
    let message;
    try { message = parseLine(line); } catch (error) { return [{ kind: "error", code: "invalid_payload", message: error.message }]; }
    switch (message.kind) {
      case "hello":
        if (message.protocolVersion !== PROTOCOL_VERSION) return [{ kind: "hello.error", ok: false, code: "PROTOCOL_MISMATCH", supportedProtocolVersions: [PROTOCOL_VERSION] }];
        return [{ kind: "hello.ack", protocolVersion: PROTOCOL_VERSION, serverInfo, epoch }];
      case "snapshot.request": return [await snapshot(message.streams)];
      case "streams.subscribe": subscriptions = Array.isArray(message.streams) && message.streams.length ? new Set(message.streams) : null; return [{ kind: "streams.subscribed", streams: subscriptions ? [...subscriptions] : [] }];
      case "streams.unsubscribe": {
        if (!subscriptions) subscriptions = new Set();
        for (const family of message.streams || []) subscriptions.delete(family);
        return [{ kind: "streams.unsubscribed", streams: message.streams || [] }];
      }
      case "resume": {
        if (message.epoch !== epoch) return [{ kind: "resume.rejected", reason: "epoch_mismatch", epoch }];
        const result = await eventsSince({ store, epoch, cursor: { epoch, perStream: message.cursor || {} } });
        return [{ kind: "resume.result", epoch, cursor: result.nextCursor.perStream, events: result.events.map((entry) => ({ kind: "event", seq: entry.seq, epoch, family: familyOf(entry.type), entry })) }];
      }
      case "action": return [await action(message)];
      case "ping": return [{ kind: "pong", ts: message.ts }];
      default: return [{ kind: "error", code: "invalid_payload", message: `Unknown message kind: ${message.kind}` }];
    }
  }

  return Object.freeze({
    handleLine,
    subscribe(listener) { if (typeof listener !== "function") throw new TypeError("listener must be a function"); listeners.add(listener); return () => listeners.delete(listener); },
    snapshot,
    close() { closed = true; listeners.clear(); if (typeof unsubscribeRuntime === "function") unsubscribeRuntime(); }
  });
}

module.exports = { PROTOCOL_VERSION, REJECTION_REASONS, createProtocolV2Server, protocolMismatchError };

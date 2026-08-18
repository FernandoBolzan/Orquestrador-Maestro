"use strict";

const fs = require("node:fs");
const net = require("node:net");
const { runtimePaths } = require("./socket-server");

function normalizeError(payload) {
  if (payload && typeof payload === "object" && payload.message !== undefined) {
    const error = new Error(String(payload.message));
    for (const [key, value] of Object.entries(payload)) {
      if (key !== "message") error[key] = value;
    }
    return error;
  }
  return new Error(String(payload || "unknown runtime error"));
}

class SocketBridgeClient {
  constructor({ projectRoot = process.cwd() } = {}) { this.paths = runtimePaths(projectRoot); this.sequence = 0; }
  async call(method, params = {}) {
    const token = fs.readFileSync(this.paths.tokenPath, "utf8").trim();
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn, value) => { if (settled) return; settled = true; fn(value); };
      const fail = (message) => settle(reject, new Error(`Runtime Maestro indisponível: ${message}`));
      const socket = net.createConnection(this.paths.socketPath); let buffer = ""; let authenticated = false;
      socket.setEncoding("utf8");
      socket.once("error", (error) => fail(error.message));
      socket.once("close", () => { if (!settled) fail(authenticated ? "daemon encerrou a conexão sem responder" : "conexão encerrada antes da autenticação"); });
      socket.once("end", () => { if (!settled) fail(authenticated ? "daemon encerrou a conexão sem responder" : "conexão encerrada pelo daemon"); });
      socket.on("connect", () => socket.write(`${JSON.stringify({ token })}\n`));
      socket.on("data", (chunk) => {
        buffer += chunk; let newline;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          let message;
          try {
            message = JSON.parse(line);
          } catch {
            socket.destroy();
            fail("resposta malformada do daemon");
            return;
          }
          if (!authenticated) {
            if (!message.ok) { socket.destroy(); settle(reject, new Error("Autenticação do runtime Maestro falhou.")); return; }
            authenticated = true; socket.write(`${JSON.stringify({ jsonrpc: "2.0", id: ++this.sequence, method, params })}\n`); continue;
          }
          socket.end();
          if (message.error) settle(reject, normalizeError(message.error));
          else settle(resolve, message.result);
        }
      });
    });
  }
  subscribe(listener) {
    const token = fs.readFileSync(this.paths.tokenPath, "utf8").trim();
    const socket = net.createConnection(this.paths.socketPath); let buffer = ""; let authenticated = false; const requestId = ++this.sequence;
    let disconnectedEmitted = false;
    socket.setEncoding("utf8");
    socket.on("connect", () => socket.write(`${JSON.stringify({ token })}\n`));
    socket.on("data", (chunk) => {
      buffer += chunk; let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          socket.destroy();
          listener({ type: "runtime.disconnected", occurredAt: new Date().toISOString(), data: { message: "resposta malformada do daemon" } });
          return;
        }
        if (!authenticated) {
          authenticated = Boolean(message.ok);
          if (authenticated) { socket.write(`${JSON.stringify({ jsonrpc: "2.0", id: requestId, method: "events.subscribe", params: {} })}\n`); continue; }
          return;
        }
        if (message.method === "maestro.event") listener(message.params);
      }
    });
    const disconnected = () => { if (disconnectedEmitted) return; disconnectedEmitted = true; listener({ type: "runtime.disconnected", occurredAt: new Date().toISOString(), data: { message: "daemon desconectado" } }); };
    socket.on("error", () => disconnected());
    socket.on("close", () => disconnected());
    socket.on("end", () => disconnected());
    return () => socket.destroy();
  }
}

function createRuntimeApplicationClient(projectRoot) {
  const client = new SocketBridgeClient({ projectRoot });
  return {
    projectRoot,
    initialize: async () => client.call("initialize", { protocolVersion: 1 }),
    inspectProject: (params) => client.call("project.inspect", params),
    listProjects: () => client.call("projects.list"),
    listProviders: () => client.call("providers.list"),
    listMissions: (params) => client.call("missions.list", params),
    createMission: (params) => client.call("missions.create", params),
    updateMission: (missionId, patch) => client.call("missions.update", { missionId, ...patch }),
    listTerminalSessions: (params) => client.call("terminals.list", params),
    createTerminalSession: (params) => client.call("agentSessions.create", params),
    closeTerminalSession: (terminalId) => client.call("agentSessions.close", { terminalId }),
    attachTerminalSession: (terminalId) => client.call("terminals.attach", { terminalId }),
    focusTerminalSession: (terminalId) => client.call("agentSessions.focus", { terminalId }),
    inputTerminalSession: (terminalId, input) => client.call("agentSessions.input", { terminalId, input }),
    resizeTerminalSession: (terminalId, columns, rows) => client.call("agentSessions.resize", { terminalId, columns, rows }),
    snapshotTerminalSession: (terminalId, afterSequence = 0) => client.call("agentSessions.snapshot", { terminalId, afterSequence }),
    subscribe: (listener) => client.subscribe(listener)
  };
}

module.exports = { SocketBridgeClient, createRuntimeApplicationClient };

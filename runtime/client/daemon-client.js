"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { runtimePaths } = require("../bridge/socket-server");
const { SocketMaestroClient } = require("./socket-maestro-client");

async function ensureDaemonClient({ projectPath = process.cwd(), timeoutMs = 5000 } = {}) {
  const projectRoot = path.resolve(projectPath);
  const paths = runtimePaths(projectRoot);
  const binPath = path.resolve(__dirname, "../../bin/orquestrador-maestro.js");

  // Attempt 1: connect to existing daemon if token file is present
  if (fs.existsSync(paths.tokenPath)) {
    try {
      const token = fs.readFileSync(paths.tokenPath, "utf8").trim();
      const client = new SocketMaestroClient({
        socketPath: paths.socketPath,
        token,
        clientId: `cli-${process.pid}`,
        requestTimeoutMs: Math.min(timeoutMs, 2000)
      });
      await client.connect();
      return client;
    } catch {
      // Stale token or unreachable daemon: fall through to auto-start
    }
  }

  // Attempt 2: spawn daemon in background
  const daemon = spawn(process.execPath, [binPath, "runtime", "--project-path", projectRoot], {
    detached: true,
    stdio: "ignore",
    shell: false
  });
  daemon.unref();

  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (!fs.existsSync(paths.tokenPath)) continue;

    try {
      const token = fs.readFileSync(paths.tokenPath, "utf8").trim();
      const client = new SocketMaestroClient({
        socketPath: paths.socketPath,
        token,
        clientId: `cli-${process.pid}`,
        requestTimeoutMs: 2000
      });
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Não foi possível conectar ao daemon Maestro em ${projectRoot}: ${lastError?.message || "timeout de inicialização"}`);
}

module.exports = { ensureDaemonClient };

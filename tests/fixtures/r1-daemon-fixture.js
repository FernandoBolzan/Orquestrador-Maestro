"use strict";

const path = require("node:path");
const { MaestroApplication } = require("../../runtime/application/maestro-application");
const { createBridge } = require("../../runtime/bridge/bridge");
const { startSocketRuntime } = require("../../runtime/bridge/socket-server");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main() {
  const projectRoot = path.resolve(argument("--project-root"));
  const runFile = path.resolve(argument("--run-file"));
  const heartbeatEnabled = !process.argv.includes("--no-heartbeat");
  const app = await new MaestroApplication({ projectRoot, runFile }).initialize();
  const bridge = createBridge({ projectRoot, services: { runtime: app, runStore: app.store, providerRegistry: app.providers, skillRegistry: app.skills } });
  const socket = startSocketRuntime(bridge, { projectRoot });
  await new Promise((resolve, reject) => {
    if (socket.server.listening) resolve();
    else { socket.server.once("listening", resolve); socket.server.once("error", reject); }
  });
  const startedAt = new Date().toISOString();
  let heartbeatBusy = false;
  const heartbeat = heartbeatEnabled ? setInterval(async () => {
    if (heartbeatBusy) return;
    heartbeatBusy = true;
    try { await app.record(null, "runtime.heartbeat", { pid: process.pid, projectRoot }); }
    finally { heartbeatBusy = false; }
  }, 100) : null;
  process.stdout.write(`${JSON.stringify({ pid: process.pid, projectRoot, runFile, startedAt, paths: socket.paths })}\n`);

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    if (heartbeat) clearInterval(heartbeat);
    await socket.close();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((error) => { process.stderr.write(`${error.stack || error.message}\n`); process.exit(1); });

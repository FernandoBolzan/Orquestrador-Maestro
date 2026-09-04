"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

function runtimePaths(projectRoot) {
  const key = crypto.createHash("sha256").update(path.resolve(projectRoot)).digest("hex").slice(0, 16);
  const base = path.join(os.tmpdir(), "maestro-runtime");
  return process.platform === "win32"
    ? { socketPath: `\\\\.\\pipe\\maestro-${key}`, tokenPath: path.join(base, `${key}.token`), pidPath: path.join(base, `${key}.pid`) }
    : { socketPath: path.join(base, `${key}.sock`), tokenPath: path.join(base, `${key}.token`), pidPath: path.join(base, `${key}.pid`) };
}

function startSocketRuntime(bridge, { projectRoot = process.cwd(), protocolV2 } = {}) {
  const paths = runtimePaths(projectRoot);
  fs.mkdirSync(path.dirname(paths.tokenPath), { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") {
    let socketExists = true;
    try { fs.statSync(paths.socketPath); } catch (error) { if (error.code === "ENOENT") socketExists = false; else throw error; }
    if (socketExists) {
      let livePid = null;
      try { livePid = Number(fs.readFileSync(paths.pidPath, "utf8").trim()); } catch {}
      if (Number.isInteger(livePid) && livePid > 0) {
        let live = false;
        try { process.kill(livePid, 0); live = true; } catch (error) { if (error.code !== "ESRCH") throw error; }
        if (live) {
          const error = new Error(`runtime already running for ${path.resolve(projectRoot)}`);
          error.code = "RUNTIME_ALREADY_RUNNING";
          throw error;
        }
      }
      try { fs.unlinkSync(paths.socketPath); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
  const token = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(paths.tokenPath, `${token}\n`, { mode: 0o600 });
  fs.writeFileSync(paths.pidPath, `${process.pid}\n`, { mode: 0o600 });
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8"); let pending = ""; let authenticated = false; let unsubscribe; let unsubscribeV2;
    // A client disappearing during TUI shutdown is ordinary lifecycle traffic.
    // Never let ECONNRESET on that client become an uncaught daemon error.
    socket.on("error", () => {});
    socket.on("close", () => { unsubscribe?.(); unsubscribe = undefined; unsubscribeV2?.(); unsubscribeV2 = undefined; });
    socket.on("data", async (chunk) => {
      pending += chunk;
      let newline;
      while ((newline = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
        try {
          const message = JSON.parse(line);
          if (!authenticated) {
            authenticated = message?.token === token; socket.write(`${JSON.stringify(authenticated ? { ok: true } : { ok: false, error: "unauthorized" })}\n`); if (!authenticated) socket.destroy();
            else if (protocolV2 && typeof protocolV2.subscribe === "function") unsubscribeV2 = protocolV2.subscribe((frame) => { if (!socket.destroyed) socket.write(`${JSON.stringify(frame)}\n`); });
            continue;
          }
          if (message?.kind && protocolV2 && typeof protocolV2.handleLine === "function") {
            const frames = await protocolV2.handleLine(JSON.stringify(message));
            for (const frame of frames || []) if (!socket.destroyed) socket.write(`${JSON.stringify(frame)}\n`);
            continue;
          }
          if (message?.method === "events.subscribe" && !unsubscribe && typeof bridge.subscribe === "function") {
            unsubscribe = bridge.subscribe((event) => {
              if (!socket.destroyed) socket.write(`${JSON.stringify({ jsonrpc: "2.0", method: "maestro.event", params: event })}\n`);
            });
          }
          const response = await bridge.handle(message); if (response) socket.write(`${JSON.stringify(response)}\n`);
        } catch { socket.write('{"error":"invalid_request"}\n'); }
      }
    });
  });
  const ready = new Promise((resolve, reject) => {
    const onError = (error) => { server.off("listening", onListening); reject(error); };
    const onListening = () => { server.off("error", onError); resolve(paths); };
    server.once("error", onError); server.once("listening", onListening); server.listen(paths.socketPath);
  });
  return { server, paths, ready, close: () => new Promise((resolve) => server.close(() => {
    let ownsArtifacts = false;
    try {
      ownsArtifacts = fs.readFileSync(paths.tokenPath, "utf8").trim() === token
        && fs.readFileSync(paths.pidPath, "utf8").trim() === String(process.pid);
    } catch {}
    if (ownsArtifacts) {
      try { fs.unlinkSync(paths.tokenPath); } catch {}
      try { fs.unlinkSync(paths.pidPath); } catch {}
      if (process.platform !== "win32") { try { fs.unlinkSync(paths.socketPath); } catch {} }
    }
    resolve();
  })) };
}

module.exports = { runtimePaths, startSocketRuntime };

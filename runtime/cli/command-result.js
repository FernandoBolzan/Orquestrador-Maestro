"use strict";

function createCommandResult({ ok = true, data = null, error = null, message = "", metadata = {} } = {}) {
  return Object.freeze({
    ok: Boolean(ok),
    data: data !== undefined ? data : null,
    error: error ? (typeof error === "string" ? error : error.message || String(error)) : null,
    message: message || (ok ? "Success" : "Command failed"),
    metadata: Object.freeze({ ...metadata, timestamp: new Date().toISOString() })
  });
}

module.exports = { createCommandResult };

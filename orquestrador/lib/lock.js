#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const LOCK_STALE_MS = 30000;
const LOCK_RETRY_MS = 50;
const LOCK_MAX_RETRIES = 100;

function acquireLock(lockPath) {
  const dir = require("node:path").dirname(lockPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const deadline = Date.now() + LOCK_RETRY_MS * LOCK_MAX_RETRIES;

  while (Date.now() < deadline) {
    try {
      fs.openSync(lockPath, "wx");
      return true;
    } catch (err) {
      if (err.code === "EEXIST") {
        try {
          const stat = fs.statSync(lockPath);
          const age = Date.now() - stat.mtimeMs;
          if (age > LOCK_STALE_MS) {
            try {
              fs.unlinkSync(lockPath);
              continue;
            } catch {}
          }
        } catch {}
        const jitter = Math.floor(Math.random() * LOCK_RETRY_MS);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_RETRY_MS + jitter);
      } else {
        throw err;
      }
    }
  }

  throw new Error(`Failed to acquire lock after ${LOCK_MAX_RETRIES} retries: ${lockPath}`);
}

function releaseLock(lockPath) {
  try {
    fs.unlinkSync(lockPath);
  } catch {}
}

function withLock(lockPath, fn) {
  acquireLock(lockPath);
  try {
    return fn();
  } finally {
    releaseLock(lockPath);
  }
}

function getLockPath(filePath) {
  return `${filePath}.lock`;
}

module.exports = { acquireLock, releaseLock, withLock, getLockPath };

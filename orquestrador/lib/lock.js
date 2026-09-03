#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const LOCK_STALE_MS = 30000;
const LOCK_MAX_AGE_MS = 300000;
const LOCK_RETRY_MS = 50;
const LOCK_MAX_RETRIES = 100;

function acquireLock(lockPath) {
  const dir = path.dirname(lockPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const ownerId = crypto.randomBytes(8).toString("hex");
  const deadline = Date.now() + LOCK_RETRY_MS * LOCK_MAX_RETRIES;

  while (Date.now() < deadline) {
    try {
      const lockData = JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString(), ownerId });
      fs.writeFileSync(lockPath, lockData, { flag: "wx", mode: 0o600 });
      return { ownerId };
    } catch (err) {
      if (err.code === "EEXIST") {
        try {
          const content = fs.readFileSync(lockPath, "utf8").trim();
          const lock = JSON.parse(content);
          const lockAge = fs.statSync(lockPath).mtimeMs;
          const age = Date.now() - lockAge;

          if (age > LOCK_STALE_MS) {
            let shouldBreak = false;
            try {
              process.kill(lock.pid, 0);
              const lockAge = Date.now() - new Date(lock.createdAt).getTime();
              if (lockAge > LOCK_MAX_AGE_MS) shouldBreak = true;
            } catch {
              shouldBreak = true;
            }

            if (shouldBreak) {
              try {
                const existingContent = fs.readFileSync(lockPath, "utf8").trim();
                const existingLock = JSON.parse(existingContent);
                if (existingLock.ownerId === lock.ownerId) {
                  fs.unlinkSync(lockPath);
                }
                continue;
              } catch {}
            }
          }
        } catch {}
        const jitter = Math.floor(Math.random() * LOCK_RETRY_MS);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_RETRY_MS + jitter);
      } else {
        throw err;
      }
    }
  }

  throw new Error(`Failed to acquire lock after timeout: ${lockPath}`);
}

function releaseLock(lockPath, ownerId) {
  try {
    const content = fs.readFileSync(lockPath, "utf8").trim();
    const lock = JSON.parse(content);
    if (lock.pid === process.pid && (!ownerId || lock.ownerId === ownerId)) {
      fs.unlinkSync(lockPath);
    }
  } catch {}
}

function withLock(lockPath, fn) {
  const { ownerId } = acquireLock(lockPath);
  try {
    return fn();
  } finally {
    releaseLock(lockPath, ownerId);
  }
}

function getLockPath(filePath) {
  return `${filePath}.lock`;
}

module.exports = { acquireLock, releaseLock, withLock, getLockPath };

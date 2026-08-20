"use strict";

const crypto = require("node:crypto");

function hash(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value || {});
  return crypto.createHash("sha256").update(serialized).digest("hex").slice(0, 16);
}

function createProgressFingerprint({ failingTests = [], changedFiles = [], verification = {}, blockers = [] } = {}) {
  const failingTestsHash = hash([...failingTests].sort());
  const changedFilesHash = hash([...changedFiles].sort());
  const verificationHash = hash({
    status: verification.status || "none",
    passed: verification.checks?.filter((c) => c.exitCode === 0).length || 0,
    failed: verification.checks?.filter((c) => c.exitCode !== 0).length || 0
  });
  const blockerHash = hash([...blockers].sort());
  const compositeHash = hash(`${failingTestsHash}:${changedFilesHash}:${verificationHash}:${blockerHash}`);

  return Object.freeze({
    kind: "progress_fingerprint",
    compositeHash,
    failingTestsHash,
    changedFilesHash,
    verificationHash,
    blockerHash,
    timestamp: new Date().toISOString()
  });
}

function isProgressMaterial(previous, current) {
  if (!previous || !current) return true;
  return previous.compositeHash !== current.compositeHash;
}

module.exports = {
  createProgressFingerprint,
  isProgressMaterial
};

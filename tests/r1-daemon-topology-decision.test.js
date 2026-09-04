"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { makeTempDir } = require("./test-helpers");

test("ratified topology assigns one daemon, socket, and store file per project", () => {
  const { createProjectRuntimeOwnership } = require("../runtime/ownership/ownership-map");
  const root = makeTempDir("maestro-r1-topology-");
  const a = createProjectRuntimeOwnership(path.join(root, "alpha"));
  const b = createProjectRuntimeOwnership(path.join(root, "beta"));

  assert.equal(a.topology, "per-project");
  assert.equal(b.topology, "per-project");
  assert.notEqual(a.projectId, b.projectId);
  assert.notEqual(a.socketPath, b.socketPath);
  assert.notEqual(a.storeFile, b.storeFile);
  assert.equal(a.writerKey, a.storeFile);
  assert.equal(b.writerKey, b.storeFile);
});

test("production application uses the same per-project store selected by the ownership contract", () => {
  const { MaestroApplication } = require("../runtime/application/maestro-application");
  const { createProjectRuntimeOwnership } = require("../runtime/ownership/ownership-map");
  const projectRoot = makeTempDir("maestro-r1-production-store-");
  const ownership = createProjectRuntimeOwnership(projectRoot);
  const app = new MaestroApplication({ projectRoot });

  assert.equal(app.store.filePath, ownership.storeFile);
});

test("single-writer registry rejects a second daemon for the same store file", () => {
  const { CanonicalWriterRegistry, createProjectRuntimeOwnership } = require("../runtime/ownership/ownership-map");
  const projectRoot = makeTempDir("maestro-r1-writer-");
  const ownership = createProjectRuntimeOwnership(projectRoot);
  const registry = new CanonicalWriterRegistry();
  const release = registry.claim(ownership, "daemon-a");
  assert.throws(() => registry.claim(ownership, "daemon-b"), /canonical writer already claimed/i);
  release();
  assert.doesNotThrow(() => registry.claim(ownership, "daemon-b"));
});

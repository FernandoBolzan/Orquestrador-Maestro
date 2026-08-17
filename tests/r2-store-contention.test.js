"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { makeTempDir } = require("./test-helpers");

test("the rejected shared-file topology is refused before cross-process contention", () => {
  const { CanonicalWriterRegistry, createProjectRuntimeOwnership } = require("../runtime/ownership/ownership-map");
  const root = makeTempDir("maestro-r2-contention-");
  const storeFile = path.join(root, "shared", "runs.json");
  const a = createProjectRuntimeOwnership(path.join(root, "alpha"), { storeFile });
  const b = createProjectRuntimeOwnership(path.join(root, "beta"), { storeFile });
  const registry = new CanonicalWriterRegistry();
  registry.claim(a, "project-alpha-daemon");
  assert.throws(() => registry.claim(b, "project-beta-daemon"), /canonical writer already claimed/i);
});

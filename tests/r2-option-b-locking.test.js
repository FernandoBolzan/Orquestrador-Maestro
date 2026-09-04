"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { makeTempDir } = require("./test-helpers");

test("file locking remains unnecessary when topology guarantees one writer per file", () => {
  const { createProjectRuntimeOwnership } = require("../runtime/ownership/ownership-map");
  const root = makeTempDir("maestro-r2-no-lock-");
  const a = createProjectRuntimeOwnership(path.join(root, "a"));
  const b = createProjectRuntimeOwnership(path.join(root, "b"));
  assert.equal(a.lockStrategy, "single-writer-daemon");
  assert.equal(b.lockStrategy, "single-writer-daemon");
  assert.notEqual(a.writerKey, b.writerKey);
});

#!/usr/bin/env node
"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const SMOKE_TESTS = [
  "tests/benchmark.test.js",
  "tests/memory.test.js",
  "tests/memory-context.test.js",
  "tests/memory-retention.test.js",
  "tests/merge-blocker-regression.test.js",
];

const ROOT = path.resolve(__dirname, "..");

let failed = 0;
let passed = 0;

for (const testFile of SMOKE_TESTS) {
  const fullPath = path.join(ROOT, testFile);
  try {
    execFileSync(process.execPath, ["--test", fullPath], {
      cwd: ROOT,
      stdio: "inherit",
      timeout: 60000,
    });
    passed++;
  } catch {
    failed++;
  }
}

console.log(`\nSmoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

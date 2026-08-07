"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { makeTempDir } = require("./test-helpers.js");

const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "bin", "orquestrador-maestro.js");

test("dry-run does not create install targets under the provided home path", () => {
  const homePath = makeTempDir("orquestrador-dry-run-home-");

  const result = spawnSync(process.execPath, [
    cliPath,
    "dry-run",
    "--home-path",
    homePath,
    "--core-only"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Mode\s+Target\s+Component/mu);
  assert.equal(fs.existsSync(path.join(homePath, ".orquestrador")), false);
  assert.equal(fs.existsSync(path.join(homePath, "AGENTS.md")), false);
});

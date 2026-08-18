"use strict";

/**
 * Package characterization gate for the Maestro TUI P0:
 *
 * - The tarball must ship the canonical UI sources (`runtime/tui/*`).
 * - `__tests__` must be excluded from the package.
 * - `@opentui/core` must be a regular dependency (the canonical renderer
 *   requires it and optional deps can be silently skipped).
 * - `node-pty` must be optional (no native build gate on Linux installs).
 * - `bun` must be an optional dependency (self-contained renderer runtime
 *   for fresh installs without Bun on PATH).
 * - Hash parity: every critical runtime/tui file installed from the tgz
 *   must equal the source tree file byte-for-byte.
 */

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const packageJson = require("../package.json");

const criticalFiles = [
  "bin/orquestrador-maestro.js",
  "package.json",
  "runtime/tui/index.js",
  "runtime/tui/opentui.ts",
  "runtime/tui/views/project-workspace-view.ts",
  "runtime/tui/views/cockpit-view.ts",
  "runtime/tui/views/taskgraph-view.ts",
  "runtime/tui/input/input-pipeline.ts",
  "runtime/tui/commands/which-key-model.ts",
  "runtime/tui/shell/activity-rail-model.ts",
  "runtime/tui/shell/breadcrumb-model.ts",
  "runtime/tui/shell/action-bar-model.ts"
];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function packTgz(destination) {
  const result = spawnSync("npm", ["pack", "--pack-destination", destination], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const name = path.basename(result.stdout.trim().split("\n").pop());
  return path.join(destination, name);
}

test("package manifest: @opentui/core obrigatorio, node-pty e bun opcionais", () => {
  assert.ok(packageJson.dependencies["@opentui/core"], "@opentui/core deve ser dependency (nao optional)");
  assert.ok(packageJson.optionalDependencies["node-pty"], "node-pty deve ser optionalDependency (nao derruba install no Linux)");
  assert.ok(packageJson.optionalDependencies["bun"], "bun deve ser optionalDependency (renderer canonico sem Bun no PATH)");
  assert.ok(packageJson.bin["orquestrador-maestro"].endsWith("bin/orquestrador-maestro.js"));
});

test("npm pack: conteudo do tgz contem a TUI canonica e exclui __tests__", () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-pack-"));
  try {
    for (const entry of fs.readdirSync(destination)) {
      fs.rmSync(path.join(destination, entry), { recursive: true, force: true });
    }
    const tgz = packTgz(destination);
    const listing = spawnSync("tar", ["-tzf", tgz], { encoding: "utf8" }).stdout;
    const files = listing.split("\n").filter(Boolean);

    assert.ok(files.includes("package/runtime/tui/opentui.ts"), "tgz deve conter runtime/tui/opentui.ts");
    assert.ok(files.includes("package/runtime/tui/index.js"), "tgz deve conter runtime/tui/index.js");
    assert.ok(files.some((entry) => entry.startsWith("package/runtime/tui/views/")));
    assert.ok(files.some((entry) => entry.startsWith("package/runtime/tui/input/")));
    assert.ok(!files.some((entry) => entry.includes("__tests__")), "tgz nao deve conter __tests__");
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
});

test("hash parity: arquivos criticos do tgz identicos ao source", () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-pack-"));
  try {
    const tgz = packTgz(destination);
    const extractDir = path.join(destination, "extract");
    fs.mkdirSync(extractDir);
    assert.equal(spawnSync("tar", ["-xzf", tgz, "-C", extractDir], { encoding: "utf8" }).status, 0);
    for (const relative of criticalFiles) {
      const sourceHash = sha256(path.join(repoRoot, relative));
      const packageHash = sha256(path.join(extractDir, "package", relative));
      assert.equal(packageHash, sourceHash, `hash diverge: ${relative}`);
    }
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
});
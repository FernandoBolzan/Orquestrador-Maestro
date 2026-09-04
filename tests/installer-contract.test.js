"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

test("installer contract stays aligned with the published package", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const powershellBootstrap = fs.readFileSync(path.join(ROOT, "scripts", "bootstrap-install.ps1"), "utf8");
  const shellBootstrap = fs.readFileSync(path.join(ROOT, "scripts", "bootstrap-install.sh"), "utf8");
  const packageVersion = packageJson.version;

  assert.match(packageVersion, /^\d+\.\d+\.\d+$/u);
  assert.match(powershellBootstrap, new RegExp(`\\$packageVersion = "${packageVersion.replaceAll(".", "\\.")}"`));
  assert.match(shellBootstrap, new RegExp(`PACKAGE_VERSION="${packageVersion.replaceAll(".", "\\.")}"`));
});

test("source installer excludes local runtime state", () => {
  const installer = fs.readFileSync(path.join(ROOT, "scripts", "install.ps1"), "utf8");

  assert.match(installer, /isLocalRuntime/);
  assert.match(installer, /relativeDirectory.*runtime/s);
  assert.match(installer, /ReparsePoint/);
  assert.match(installer, /Get-TreeFiles/);
});

test("desktop notifications keep a compatible notifier API and safe uuid override", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const notifier = require("node-notifier");

  assert.equal(typeof notifier.notify, "function");
  assert.equal(packageJson.overrides?.["node-notifier"]?.uuid, "11.1.1");
  assert.equal(require("uuid/package.json").version, "11.1.1");
});

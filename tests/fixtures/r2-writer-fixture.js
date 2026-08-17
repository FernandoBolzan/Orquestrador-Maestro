"use strict";

const path = require("node:path");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");

const markerIndex = process.argv.indexOf("--crash-marker");
if (markerIndex >= 0) {
  const markerPath = path.resolve(process.argv[markerIndex + 1]);
  const originalRename = fsPromises.rename;
  fsPromises.rename = async (...args) => {
    fs.writeFileSync(markerPath, `${process.pid}\n`, "utf8");
    await new Promise((resolve) => setTimeout(resolve, 60_000));
    return originalRename(...args);
  };
}

const { JsonFileRunStore } = require("../../runtime/store/json-file-run-store");

async function main() {
  const filePath = path.resolve(process.argv[2]);
  const prefix = process.argv[3] || `writer-${process.pid}`;
  const count = Number(process.argv[4] || 100);
  const store = new JsonFileRunStore({ filePath });
  for (let index = 0; index < count; index += 1) {
    await store.appendEvent({ id: `${prefix}-event-${index}`, type: "fixture.write", data: { writer: prefix, index } });
  }
  process.stdout.write(`${JSON.stringify({ written: count, prefix })}\n`);
}

main().catch((error) => { process.stderr.write(`${error.stack || error.message}\n`); process.exit(1); });

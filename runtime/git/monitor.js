"use strict";

const { spawnSync } = require("node:child_process");

function runGit(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false });
  if (result.error || result.status !== 0) return null;
  return result.stdout;
}

function snapshot(cwd) {
  const status = runGit(["status", "--porcelain=v1", "-z"], cwd);
  if (status === null) return { available: false, files: [] };
  const files = status.split("\0").filter(Boolean).map((line) => ({ status: line.slice(0, 2), path: line.slice(3) }));
  return { available: true, files };
}

function diff(cwd) {
  const names = runGit(["diff", "--name-status", "-z"], cwd);
  const stats = runGit(["diff", "--numstat"], cwd);
  const changedFiles = [];
  if (names !== null) {
    const tokens = names.split("\0").filter(Boolean);
    let i = 0;
    while (i < tokens.length) {
      const kind = tokens[i][0];
      const isRename = kind === "R" || kind === "C";
      if (isRename) {
        if (tokens[i + 2] !== undefined) { changedFiles.push(tokens[i + 2]); i += 3; continue; }
        if (tokens[i + 1] !== undefined) { changedFiles.push(tokens[i + 1]); i += 2; continue; }
        i += 1; continue;
      }
      if (tokens[i + 1] !== undefined) changedFiles.push(tokens[i + 1]);
      i += 2;
    }
  }
  return {
    available: names !== null && stats !== null,
    changedFiles,
    stats: stats === null ? [] : stats.trim().split("\n").filter(Boolean).map((line) => {
      const [added, deleted, file] = line.split("\t");
      return { added: Number(added) || 0, deleted: Number(deleted) || 0, file };
    })
  };
}

module.exports = { diff, snapshot };

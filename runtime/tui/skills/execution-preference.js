"use strict";

const fs = require("node:fs");

const TIERS = Object.freeze(["economy", "balanced", "reasoning"]);
const PROVIDERS = Object.freeze(["codex", "claude", "opencode", "gemini", "agy"]);
const DEFAULT_PREFERENCES = Object.freeze({ tier: "balanced" });

function validatePreferences(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("preferences must be an object");
  if (input.tier !== undefined && !TIERS.includes(input.tier)) throw new TypeError("invalid tier");
  if (input.preferredProvider !== undefined && !PROVIDERS.includes(input.preferredProvider)) throw new TypeError("invalid preferredProvider");
  if (input.preferredModel !== undefined && typeof input.preferredModel !== "string") throw new TypeError("invalid preferredModel");
  return {
    ...(input.tier !== undefined ? { tier: input.tier } : {}),
    ...(input.preferredProvider !== undefined ? { preferredProvider: input.preferredProvider } : {}),
    ...(input.preferredModel !== undefined ? { preferredModel: input.preferredModel } : {})
  };
}

function parsePreferences(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return { ...DEFAULT_PREFERENCES };
  return { ...DEFAULT_PREFERENCES, ...validatePreferences(JSON.parse(fs.readFileSync(filePath, "utf8"))) };
}

function toSemanticTaskInput() {
  const error = new Error("ROUTING_CONTAMINATION: executionPreference belongs to runtime config, not SemanticTask");
  error.code = "ROUTING_CONTAMINATION";
  throw error;
}

module.exports = { TIERS, PROVIDERS, DEFAULT_PREFERENCES, validatePreferences, validate: validatePreferences, parsePreferences, toSemanticTaskInput };

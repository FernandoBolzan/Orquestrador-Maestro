"use strict";

const { assertObject, requiredString, optionalString, optionalArray, optionalObject, enumValue } = require("../../core/validation");

const SKILL_SOURCES = Object.freeze(["project", "user", "maestro", "community"]);
const SKILL_VERIFICATIONS = Object.freeze(["maestro_verified", "user_verified", "unverified"]);

function createSkillDescriptor(input = {}) {
  assertObject(input, "skill descriptor");
  const id = requiredString(input.id, "skill descriptor.id");
  const name = requiredString(input.name || input.displayName || id, "skill descriptor.name");
  const description = optionalString(input.description, "skill descriptor.description") || "";
  const version = optionalString(input.version, "skill descriptor.version") || "1.0.0";
  const source = enumValue(input.source, "skill descriptor.source", SKILL_SOURCES, "project");
  const verification = enumValue(input.verification, "skill descriptor.verification", SKILL_VERIFICATIONS, "unverified");

  const capabilities = optionalArray(input.capabilities, "skill descriptor.capabilities", (item) => requiredString(item, "capability")) || [];
  const triggers = optionalArray(input.triggers, "skill descriptor.triggers", (item) => requiredString(item, "trigger")) || [];
  const aliases = optionalArray(input.aliases, "skill descriptor.aliases", (item) => requiredString(item, "alias")) || [];
  const providers = optionalArray(input.providers, "skill descriptor.providers", (item) => requiredString(item, "provider")) || [];
  const platforms = optionalArray(input.platforms, "skill descriptor.platforms", (item) => requiredString(item, "platform")) || [];

  return Object.freeze({
    kind: "skill_descriptor",
    id,
    name,
    displayName: name,
    description,
    version,
    source,
    provenance: optionalObject(input.provenance, "skill descriptor.provenance") || { source },
    verification,
    capabilities: Object.freeze([...capabilities]),
    triggers: Object.freeze([...triggers]),
    aliases: Object.freeze([...aliases]),
    providers: Object.freeze([...providers]),
    platforms: Object.freeze([...platforms]),
    contextCost: input.contextCost || "low",
    safety: input.safety || "safe",
    installed: input.installed !== false,
    active: Boolean(input.active),
    path: optionalString(input.path, "skill descriptor.path")
  });
}

module.exports = {
  SKILL_SOURCES,
  SKILL_VERIFICATIONS,
  createSkillDescriptor
};

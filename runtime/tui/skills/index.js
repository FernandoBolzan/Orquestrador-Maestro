"use strict";

const path = require("node:path");
const { SkillRegistry } = require("../../skills/registry");
const { normalizeSkills, CATEGORY_MAP } = require("../skills/normalize");
const { searchSkills } = require("./search");
const { recommendForProject } = require("./recommend");
const skillsState = require("./skills-state");
const executionPreference = require("./execution-preference");

module.exports = { SkillRegistry, normalizeSkills, CATEGORY_MAP, searchSkills, recommendForProject, ...skillsState, ...executionPreference, path };

"use strict";

const { createSkillDescriptor, SKILL_SOURCES, SKILL_VERIFICATIONS } = require("./descriptor");
const { normalizeSkills, normalizeCategory, CATEGORY_MAP } = require("./normalize");
const { searchSkills, levenshteinDistance } = require("./search");
const { recommendForProject, recommendations, RANK_ORDER } = require("./recommend");
const { SkillCatalog } = require("./catalog");

module.exports = {
  CATEGORY_MAP,
  RANK_ORDER,
  SKILL_SOURCES,
  SKILL_VERIFICATIONS,
  SkillCatalog,
  createSkillDescriptor,
  levenshteinDistance,
  normalizeCategory,
  normalizeSkills,
  recommendForProject,
  recommendations,
  searchSkills
};

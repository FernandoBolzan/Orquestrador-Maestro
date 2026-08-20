"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { SkillRegistry } = require("../registry");
const { normalizeSkills } = require("./normalize");
const { searchSkills } = require("./search");
const { recommendForProject } = require("./recommend");
const { createSkillDescriptor } = require("./descriptor");

class SkillCatalog {
  constructor({ maestroRoot, projectRoot, userHome, pins = {} } = {}) {
    this.maestroRoot = maestroRoot || path.resolve(__dirname, "../../..");
    this.projectRoot = projectRoot || process.cwd();
    this.userHome = userHome;
    this.registry = new SkillRegistry({ maestroRoot: this.maestroRoot, projectRoot: this.projectRoot, userHome: this.userHome });
    this.pins = pins; // { global: [], byProject: { [projectId]: [] } }
  }

  getAll() {
    return normalizeSkills(this.registry);
  }

  get(id) {
    const all = this.getAll();
    return all.find((s) => s.id === id || s.identity === id || (s.aliases && s.aliases.includes(id))) || null;
  }

  list({ tier = "all", source, category, query } = {}) {
    let list = this.getAll();
    if (source) {
      list = list.filter((s) => s.source === source);
    }
    if (category) {
      list = list.filter((s) => s.normalizedCategory.toLowerCase() === category.toLowerCase() || s.rawCategory.toLowerCase() === category.toLowerCase());
    }
    if (query) {
      const searchRes = searchSkills(list, query);
      const matchedIndexes = new Set(searchRes.results.map((r) => r.index));
      list = list.filter((_, idx) => matchedIndexes.has(idx));
    }
    return list;
  }

  active({ projectId } = {}) {
    const all = this.getAll();
    const pinsGlobal = new Set(this.pins?.global || []);
    const pinsProj = new Set((this.pins?.byProject && this.pins.byProject[projectId]) || []);
    return all.filter((s) => pinsGlobal.has(s.id) || pinsProj.has(s.id));
  }

  installed({ projectId } = {}) {
    return this.getAll().filter((s) => ["project", "user", "maestro"].includes(s.source));
  }

  availableCommunity() {
    const communityDir = path.join(this.maestroRoot, "skill-library", "community-skills");
    if (!fs.existsSync(communityDir)) return [];
    try {
      const entries = fs.readdirSync(communityDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(communityDir, entry.name, "SKILL.md")))
        .map((entry) => {
          const skillPath = path.join(communityDir, entry.name);
          return createSkillDescriptor({
            id: entry.name,
            name: entry.name,
            source: "community",
            verification: "unverified",
            installed: false,
            path: skillPath
          });
        });
    } catch {
      return [];
    }
  }

  recommend({ projectId, projectStack = [], missionBrief = "", taskGraph = [] } = {}) {
    const all = this.getAll();
    return recommendForProject(all, projectId, {
      projectStack,
      missionBrief,
      taskGraph,
      pins: this.pins
    });
  }

  pin(id, { projectId, global = false } = {}) {
    if (global) {
      if (!this.pins.global) this.pins.global = [];
      if (!this.pins.global.includes(id)) this.pins.global.push(id);
    } else if (projectId) {
      if (!this.pins.byProject) this.pins.byProject = {};
      if (!this.pins.byProject[projectId]) this.pins.byProject[projectId] = [];
      if (!this.pins.byProject[projectId].includes(id)) this.pins.byProject[projectId].push(id);
    }
    return true;
  }

  unpin(id, { projectId, global = false } = {}) {
    if (global && this.pins.global) {
      this.pins.global = this.pins.global.filter((item) => item !== id);
    }
    if (projectId && this.pins.byProject?.[projectId]) {
      this.pins.byProject[projectId] = this.pins.byProject[projectId].filter((item) => item !== id);
    }
    return true;
  }
}

module.exports = { SkillCatalog };

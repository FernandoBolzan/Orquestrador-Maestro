"use strict";

const { selectSkillState } = require("../skills/skills-state");

function explorerModel(skills, state, { columns = 80, collapsed = false, projectId, status = "all", selectedId } = {}) {
  const categories = [...new Set(skills.map((skill) => skill.normalizedCategory).filter(Boolean))]
    .map((id) => ({ id, count: skills.filter((skill) => skill.normalizedCategory === id).length }));
  const matchesStatus = (skill) => {
    if (status === "all") return true;
    const selected = selectSkillState(state, skill.id, projectId);
    if (status === "pinned") return selected.pinned.global || selected.pinned.project;
    return Boolean(selected[status]);
  };
  const visible = skills.filter(matchesStatus);
  const recommended = skills.filter((skill) => selectSkillState(state, skill.id, projectId).recommended);
  const active = skills.filter((skill) => selectSkillState(state, skill.id, projectId).active);
  const pinned = skills.filter((skill) => {
    const value = selectSkillState(state, skill.id, projectId).pinned;
    return value.global || value.project;
  });
  return {
    sections: { recommended, active, pinned, categories, all: skills.slice() },
    visible,
    dockWidth: collapsed ? 24 : Math.floor(columns * 0.3),
    selected: skills.find((skill) => skill.id === selectedId) || visible[0] || null
  };
}

function detailModel(skillId, state, { skills = [], projectId, attachAvailable = false } = {}) {
  const skill = skills.find((item) => item.id === skillId);
  if (!skill) return null;
  const rec = state.recommendations[skillId];
  const evidence = [];
  for (const reason of (rec && rec.reasons) || []) evidence.push(`• ${reason}`);
  for (const item of (rec && rec.evidence) || []) evidence.push(`• ${item.kind}: ${String(item.payload)}`);
  return {
    header: {
      id: skill.id, name: skill.displayName, description: skill.description,
      category: skill.normalizedCategory, rawCategory: skill.rawCategory, risk: skill.risk, source: skill.source
    },
    state: selectSkillState(state, skillId, projectId),
    evidence,
    actions: [
      { id: "inspect", enabled: true, tooltip: "" },
      { id: "pin", enabled: true, tooltip: "" },
      { id: "attach", enabled: Boolean(attachAvailable), tooltip: attachAvailable ? "" : "em breve (runtime contract)" },
      { id: "openSource", enabled: true, tooltip: "" },
      { id: "viewInstructions", enabled: true, tooltip: "" }
    ]
  };
}

module.exports = { explorerModel, detailModel };

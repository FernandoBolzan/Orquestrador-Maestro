"use strict";

function initialSkillsState() {
  return { byId: {}, ids: [], recommendations: {}, attachedByProject: {}, activeByProject: {}, pins: { global: {}, byProject: {} } };
}

function cloneState(state) {
  return {
    ...state,
    byId: { ...state.byId }, ids: state.ids.slice(), recommendations: { ...state.recommendations },
    attachedByProject: { ...state.attachedByProject }, activeByProject: { ...state.activeByProject },
    pins: { global: { ...state.pins.global }, byProject: { ...state.pins.byProject } }
  };
}

function projectFlags(collection, projectId) {
  return collection[projectId] || {};
}

function skillsReducer(state = initialSkillsState(), action = {}) {
  const next = cloneState(state);
  switch (action.type) {
    case "catalog.loaded":
      next.byId = Object.fromEntries((action.skills || []).map((skill) => [skill.id, skill]));
      next.ids = (action.skills || []).map((skill) => skill.id);
      return next;
    case "recommendations.loaded":
      next.recommendations = Object.fromEntries((action.recommendations || []).map((rec) => [rec.skillId, rec]));
      return next;
    case "skill.attached":
      next.attachedByProject[action.projectId] = { ...projectFlags(state.attachedByProject, action.projectId), [action.skillId]: true };
      return next;
    case "skill.activated":
      next.activeByProject[action.projectId] = { ...projectFlags(state.activeByProject, action.projectId), [action.skillId]: true };
      return next;
    case "skill.pinned":
      if (action.scope === "global") next.pins.global[action.skillId] = true;
      else next.pins.byProject[action.projectId] = { ...projectFlags(state.pins.byProject, action.projectId), [action.skillId]: true };
      return next;
    default:
      return state;
  }
}

function selectSkillState(state, id, projectId) {
  return {
    available: Boolean(state.byId[id]),
    recommended: Boolean(state.recommendations[id]),
    attached: Boolean(projectFlags(state.attachedByProject, projectId)[id]),
    active: Boolean(projectFlags(state.activeByProject, projectId)[id]),
    pinned: {
      global: Boolean(state.pins.global[id]),
      project: Boolean(projectFlags(state.pins.byProject, projectId)[id])
    }
  };
}

function selectCounts(state, projectId) {
  const counts = { available: 0, recommended: 0, attached: 0, active: 0, pinned: 0 };
  for (const id of state.ids) {
    const selected = selectSkillState(state, id, projectId);
    for (const key of ["available", "recommended", "attached", "active"]) if (selected[key]) counts[key]++;
    if (selected.pinned.global || selected.pinned.project) counts.pinned++;
  }
  return counts;
}

module.exports = { initialSkillsState, skillsReducer, selectSkillState, skillState: selectSkillState, selectCounts, counts: selectCounts };

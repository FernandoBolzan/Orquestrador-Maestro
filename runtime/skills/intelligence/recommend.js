"use strict";

const RANK_ORDER = ["USER_PINNED", "DETERMINISTIC", "AI_SUGGESTED"];

function tokens(value) {
  return String(value || "").toLowerCase().split(/[^a-z0-9á-ú]+/u).filter(Boolean);
}

function searchableTokens(skill) {
  return new Set(tokens([
    skill.id, skill.displayName || skill.name, skill.description, skill.rawCategory,
    skill.normalizedCategory, ...(skill.triggers || []), ...(skill.aliases || []), ...(skill.tags || [])
  ].join(" ")));
}

function recommendForProject(views, projectId, {
  projectStack = [], missionBrief = "", taskGraph = [], pins = {}, aiSuggestions = [],
  now = Date.now(), lastAiRefreshAt = -Infinity, aiCooldownMs = 0
} = {}) {
  const pinsGlobal = new Set(pins?.global || []);
  const pinsProject = new Set((pins?.byProject && pins.byProject[projectId]) || []);

  const recs = [];

  for (const skill of views) {
    if (pinsGlobal.has(skill.id) || pinsProject.has(skill.id)) {
      recs.push({
        skillId: skill.id,
        skillName: skill.displayName || skill.name || skill.id,
        source: "USER_PINNED",
        rank: 1,
        confidence: 1.0,
        reasons: ["Pinado pelo usuário"],
        evidence: [{ kind: "user_pinned", payload: pinsGlobal.has(skill.id) ? "global" : projectId }],
        appliesTo: pinsGlobal.has(skill.id) ? "global" : projectId
      });
    }
  }

  for (const skill of views) {
    if (pinsGlobal.has(skill.id) || pinsProject.has(skill.id)) continue;
    const skillTokens = searchableTokens(skill);
    const stackHit = projectStack.find((tech) => tokens(tech).some((token) => skillTokens.has(token)));
    const briefHits = tokens(missionBrief).filter((token) => skillTokens.has(token));
    const graphText = Array.isArray(taskGraph) ? taskGraph.map((task) => task.title || task.description || task).join(" ") : JSON.stringify(taskGraph || {});
    const graphHits = tokens(graphText).filter((token) => skillTokens.has(token));
    if (!stackHit && briefHits.length === 0 && graphHits.length === 0) continue;
    const evidence = [];
    const reasons = [];
    let score = 0.5;

    if (stackHit) {
      evidence.push({ kind: "detected_tech", payload: stackHit });
      reasons.push(`Stack detectada: ${stackHit}`);
      score += 0.25;
    }
    if (briefHits.length) {
      evidence.push({ kind: "mission_brief", payload: briefHits.join(", ") });
      reasons.push(`Missão relacionada: ${briefHits.join(", ")}`);
      score += 0.15;
    }
    if (graphHits.length) {
      evidence.push({ kind: "taskgraph", payload: graphHits.join(", ") });
      reasons.push(`TaskGraph relacionado: ${graphHits.join(", ")}`);
      score += 0.1;
    }

    recs.push({
      skillId: skill.id,
      skillName: skill.displayName || skill.name || skill.id,
      source: "DETERMINISTIC",
      rank: 2,
      confidence: Math.min(0.99, Number(score.toFixed(2))),
      reasons,
      evidence,
      appliesTo: projectId
    });
  }

  if (now - lastAiRefreshAt >= aiCooldownMs) {
    const known = new Set(views.map((skill) => skill.id));
    for (const suggestion of aiSuggestions) {
      if (!known.has(suggestion.skillId) || recs.some((rec) => rec.skillId === suggestion.skillId)) continue;
      const reason = suggestion.reason || "Sugestão contextual de IA";
      recs.push({
        skillId: suggestion.skillId,
        skillName: suggestion.displayName || suggestion.skillId,
        source: "AI_SUGGESTED",
        rank: 3,
        confidence: suggestion.confidence || 0.75,
        reasons: [reason],
        evidence: [{ kind: "task_relevant", payload: reason }],
        appliesTo: projectId
      });
    }
  }

  recs.sort((a, b) => a.rank - b.rank || (b.confidence - a.confidence) || a.skillId.localeCompare(b.skillId));
  return recs.slice(0, 30);
}

module.exports = { recommendForProject, recommendations: recommendForProject, RANK_ORDER };

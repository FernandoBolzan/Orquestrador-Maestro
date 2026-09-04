"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeSkills } = require("../skills/normalize");
const { SkillRegistry } = require("../../skills/registry");
const { recommendForProject } = require("../skills/recommend");

const views = normalizeSkills(new SkillRegistry());

test("T9.3: USER_PINNED global é rank 1 e recebe razão", () => {
  const pins = { global: ["skill-saas-factory"], byProject: {} };
  const recs = recommendForProject(views, "projA", { pins });
  const pin = recs.find((r) => r.skillId === "skill-saas-factory");
  assert.ok(pin, "skill pinada deve aparecer nas recomendações");
  assert.equal(pin.rank, 1);
  assert.equal(pin.source, "USER_PINNED");
  assert.ok(pin.reasons[0].length > 0);
  assert.deepEqual(pin.evidence, [{ kind: "user_pinned", payload: "global" }]);
});

test("T9.3: mission brief e taskgraph geram recomendação determinística com evidência", () => {
  const fixture = [{
    id: "skill-testing", displayName: "Testing", description: "Testes de software",
    rawCategory: "testing", normalizedCategory: "Other", triggers: ["testes", "implementação"], aliases: [], tags: []
  }];
  const recs = recommendForProject(fixture, "A", {
    missionBrief: "Finalizar implementação e testes",
    taskGraph: [{ title: "Executar testes" }]
  });
  assert.equal(recs[0].source, "DETERMINISTIC");
  assert.equal(recs[0].rank, 2);
  assert.ok(recs[0].evidence.some((item) => item.kind === "mission_brief"));
  assert.ok(recs[0].evidence.some((item) => item.kind === "taskgraph"));
});

test("T9.3: AI sugerida respeita cooldown e mantém source/rank/evidência", () => {
  const fixture = [{ id: "skill-ai", displayName: "AI", triggers: [], aliases: [], tags: [] }];
  const fresh = recommendForProject(fixture, "A", {
    aiSuggestions: [{ skillId: "skill-ai", reason: "Adequada ao contexto" }],
    now: 10_000,
    lastAiRefreshAt: 0,
    aiCooldownMs: 5_000
  });
  assert.equal(fresh[0].source, "AI_SUGGESTED");
  assert.equal(fresh[0].rank, 3);
  assert.ok(fresh[0].evidence.length > 0);
  const cooling = recommendForProject(fixture, "A", {
    aiSuggestions: [{ skillId: "skill-ai" }], now: 10_000, lastAiRefreshAt: 8_000, aiCooldownMs: 5_000
  });
  assert.deepEqual(cooling, []);
});

test("T9.3: USER_PINNED de projeto NÃO vaza para outro projeto (isolamento)", () => {
  const pins = { global: [], byProject: { A: ["skill-abacatepay-integration"], B: [] } };
  const recsB = recommendForProject(views, "B", { pins });
  assert.ok(
    !recsB.some((r) => r.skillId === "skill-abacatepay-integration"),
    "pin do projeto A não pode aparecer no projeto B"
  );
  const recsA = recommendForProject(views, "A", { pins });
  assert.ok(recsA.some((r) => r.skillId === "skill-abacatepay-integration"), "pin do A aparece em A");
});

test("T9.3: DETERMINISTIC detecta stack real (supabase) e produz evidence detected_tech", () => {
  const recs = recommendForProject(views, "projA", { projectStack: ["supabase", "node"] });
  const rec = recs.find((r) => r.skillId === "skill-supabase-rls");
  assert.ok(rec, "stack supabase deve recomendar skill-supabase-rls");
  assert.equal(rec.source, "DETERMINISTIC");
  assert.ok(rec.evidence.some((e) => e.kind === "detected_tech"), "evidence detected_tech presente");
  assert.ok(rec.reasons[0].length > 0, "razão legível");
});

test("T9.3: nunca mostra percentual fake nem source inventado", () => {
  const recs = recommendForProject(views, "projA", { projectStack: ["postgres"] });
  for (const r of recs) {
    assert.ok(!/%/.test(JSON.stringify(r.reasons)) || r.reasons.length === 0, `sem porcentagem fake: ${r.skillId}`);
    assert.ok(["USER_PINNED", "DETERMINISTIC", "AI_SUGGESTED"].includes(r.source));
    assert.ok(r.rank >= 1 && r.rank <= 3);
  }
});

test("T9.3: sugestão determinística respeita rank ordinal pinned > deterministic", () => {
  const pins = { global: ["skill-elevenlabs-voice-cloning"], byProject: {} };
  const recs = recommendForProject(views, "projA", { projectStack: ["elevenlabs"], pins });
  const pin = recs.find((r) => r.skillId === "skill-elevenlabs-voice-cloning");
  const det = recs.find((r) => r.skillId === "skill-ai-orchestration");
  assert.ok(pin && pin.rank === 1, "pinned deve ter rank 1");
  if (det) assert.ok(det.rank > 1, "deterministic deve vir depois do pinned");
});

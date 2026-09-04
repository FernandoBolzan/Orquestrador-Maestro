import test from "node:test";
import assert from "node:assert/strict";
import { attentionReducer, createAttentionState, pendingByProject, totalPending, focusSurfaces } from "../attention/attention-state.ts";
import { attentionCenter } from "../attention/attention-center.ts";

const base = { missionId: "m1", taskId: "t1", status: "PENDING", reason: "A decisão altera o plano.", impact: "Execução bloqueada.", evidence: ["diff --stat"], recommendation: "Aprovar após inspeção.", actions: ["approve", "reject"], createdAt: "2026-08-16T10:00:00.000Z" } as const;

test("T8.1 mantém fila global/projeto, contrato F7 e badges derivados", () => {
  let state = createAttentionState();
  state = attentionReducer(state, { type: "attention.created", item: { ...base, id: "a1", projectId: "p1", type: "DECISION", severity: "WARNING", title: "Escolher estratégia" } });
  state = attentionReducer(state, { type: "attention.created", item: { ...base, id: "a2", projectId: "p2", type: "SECURITY", severity: "CRITICAL", title: "Segredo detectado", evidence: ["secret scan: linha 7"], recommendation: "Revogar antes de continuar." } });
  state = attentionReducer(state, { type: "attention.created", item: { ...base, id: "a3", projectId: "p1", type: "FAILURE", severity: "INFO", title: "Verificação informativa" } });
  assert.equal(totalPending(state), 3); assert.equal(totalPending(state, "p1"), 2); assert.equal(pendingByProject(state, "p2").length, 1);
  assert.deepEqual(attentionCenter(state).map((item) => item.id), ["a2", "a1", "a3"]);
  assert.deepEqual(state.byId.a2?.evidence, ["secret scan: linha 7"]); assert.equal(state.byId.a2?.recommendation, "Revogar antes de continuar.");
  assert.deepEqual(focusSurfaces(state), { total: 3, byProject: { p1: 2, p2: 1 } });
});

test("T8.1 resolução remove da fila pendente sem apagar evidência da resolução", () => {
  const created = attentionReducer(createAttentionState(), { type: "attention.created", item: { ...base, id: "a1", projectId: "p1", type: "APPROVAL", severity: "WARNING", title: "Aprovar plano" } });
  const resolved = attentionReducer(created, { type: "attention.resolved", id: "a1", decision: "reject", resolvedAt: "2026-08-16T11:00:00.000Z" });
  assert.equal(totalPending(resolved), 0); assert.equal(resolved.byId.a1, undefined);
  assert.equal(resolved.resolvedById.a1?.resolvedAt, "2026-08-16T11:00:00.000Z"); assert.equal(resolved.resolvedById.a1?.decision, "reject");
  assert.ok(Object.isFrozen(resolved)); assert.ok(Object.isFrozen(resolved.ids));
});

test("T8.1 replay created → snoozed preserva a pendência e o prazo sem autorizar", () => {
  const created = attentionReducer(createAttentionState(), { type: "attention.created", item: { ...base, id: "a1", projectId: "p1", type: "APPROVAL", severity: "CRITICAL", title: "Aprovar plano" } });
  const snoozed = attentionReducer(created, { type: "attention.snoozed", id: "a1", snoozedUntil: "2026-08-17T12:15:00.000Z" });
  assert.equal(totalPending(snoozed), 1);
  assert.equal(snoozed.byId.a1?.status, "SNOOZED");
  assert.equal(snoozed.byId.a1?.decision, "snooze");
  assert.equal(snoozed.byId.a1?.snoozedUntil, "2026-08-17T12:15:00.000Z");
  assert.equal(snoozed.resolvedById.a1, undefined);
});

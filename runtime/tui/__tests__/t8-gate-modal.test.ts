import test from "node:test";
import assert from "node:assert/strict";
import { canOpenGate, createGateState, gateModalModel, gateReducer } from "../views/gate-modal.ts";

const item = { id: "gate-1", projectId: "p1", type: "APPROVAL", severity: "CRITICAL", status: "PENDING", title: "Aprovar migração", reason: "DDL destrutivo", impact: "Pode bloquear escrita", evidence: ["ALTER TABLE"], recommendation: "Criar backup", actions: ["approve", "reject"], createdAt: "2026-08-16T10:00:00.000Z" } as const;

test("T8.2 modal expõe WHAT/WHY/IMPACT/EVIDENCE/RECOMMENDATION e ações exatas", () => {
  const model = gateModalModel(item);
  assert.deepEqual(model.sections.map((section) => section.id), ["WHAT", "WHY", "IMPACT", "EVIDENCE", "RECOMMENDATION"]);
  assert.ok(model.sections.every((section) => section.content.length > 0));
  assert.deepEqual(model.actions, [
    { key: "1", id: "inspect", label: "Inspect" }, { key: "2", id: "openDiff", label: "Open Diff" },
    { key: "3", id: "approve", label: "Approve" }, { key: "4", id: "reject", label: "Reject" }, { key: "s", id: "snooze", label: "Snooze" }
  ]);
});

test("T8.2 mantém um gate, snooze nunca autoriza e Esc só fecha overlay", () => {
  let state = gateReducer(createGateState([item.id]), { type: "gate.open", item });
  assert.equal(canOpenGate(state, { ...item, id: "gate-2" }), false); assert.equal(state.focusLayer, "MODAL");
  state = gateReducer(state, { type: "gate.snooze", id: item.id, until: "2026-08-16T12:00:00.000Z", now: "2026-08-16T11:00:00.000Z" });
  assert.deepEqual(state.pendingIds, [item.id]); assert.equal(state.decisions[item.id], undefined); assert.equal(state.snoozedUntil[item.id], "2026-08-16T12:00:00.000Z");
  state = gateReducer(state, { type: "gate.open", item }); state = gateReducer(state, { type: "gate.escape" });
  assert.equal(state.open, false); assert.deepEqual(state.pendingIds, [item.id]); assert.equal(state.focusLayer, "WINDOW_CONTENT");
});

test("T8.2 approve exige decisão explícita e palette sobrepõe modal", () => {
  const open = gateReducer(createGateState([item.id]), { type: "gate.open", item });
  assert.throws(() => gateReducer(open, { type: "gate.approve", id: item.id }), /decision.*approve/);
  const palette = gateReducer(open, { type: "palette.open" }); assert.equal(palette.focusLayer, "PALETTE");
  const approved = gateReducer(open, { type: "gate.approve", id: item.id, decision: "approve" });
  assert.equal(approved.decisions[item.id], "approve"); assert.deepEqual(approved.pendingIds, []);
});

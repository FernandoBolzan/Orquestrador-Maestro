"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("T8 renderer real mostra gate, ações e toast sem conceder autorização no snooze", { skip: !process.env.ORQUESTRADOR_TUI_BUN_E2E ? "ORQUESTRADOR_TUI_BUN_E2E=1 não habilitado" : false }, async () => {
  assert.ok(globalThis.Bun, "execute este gate com Bun");
  const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../testing/fixtures/attention/decision-gate.json"), "utf8"));
  const testing = await import("@opentui/core/testing");
  const core = await import("@opentui/core");
  const gate = await import("../views/gate-modal.ts");
  const notifications = await import("../notifications/notification-state.ts");
  const toasts = await import("../notifications/toast-region.ts");
  const harness = await testing.createTestRenderer({ width: 90, height: 30 });
  try {
    let gateState = gate.createGateState([fixture.id]);
    gateState = gate.gateReducer(gateState, { type: "gate.open", item: fixture });
    const model = gate.gateModalModel(fixture);
    let notificationState = notifications.createNotificationState();
    notificationState = notifications.notificationReducer(notificationState, { type: "attention.created", entityId: fixture.id, hash: "gate", tier: "CRITICAL", timestamp: Date.parse(fixture.createdAt), payload: fixture });
    const region = toasts.toastRegion(notificationState.toasts);
    const text = new core.TextRenderable(harness.renderer, { content: `${model.sections.map((section) => `${section.id}: ${section.content}`).join("\n")}\n${model.actions.map((action) => `[${action.key}] ${action.label}`).join(" ")}\nTOAST: ${region.visible[0].message}` });
    harness.renderer.root.add(text); await harness.waitForVisualIdle();
    const frame = harness.captureCharFrame();
    for (const label of ["WHAT", "WHY", "IMPACT", "EVIDENCE", "RECOMMENDATION", "Approve", "Reject", "Snooze", "TOAST"]) assert.match(frame, new RegExp(label, "u"));
    const snoozed = gate.gateReducer(gateState, { type: "gate.snooze", id: fixture.id, until: "2026-08-18T00:00:00.000Z", now: "2026-08-17T00:00:00.000Z" });
    assert.equal(snoozed.decisions[fixture.id], undefined);
    assert.equal(snoozed.pendingIds.includes(fixture.id), true);
    assert.equal(region.focusable, false);
  } finally { harness.renderer.destroy(); }
});

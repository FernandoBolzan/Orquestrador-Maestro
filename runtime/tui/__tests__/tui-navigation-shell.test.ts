import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkspaceTabs, isCockpitTab, railVisibility, primaryWorkspaceSurface } from "../shell/navigation-model.ts";

test("navigation shell keeps Cockpit fixed and projects as workspace tabs", () => {
  const tabs = buildWorkspaceTabs([
    { id: "a", name: "Backend API", status: "running", badge: "●1" },
    { id: "b", name: "Frontend", status: "verifying", badge: "◐" },
  ]);
  assert.equal(tabs[0].id, "cockpit");
  assert.equal(tabs[0].kind, "cockpit");
  assert.deepEqual(tabs.slice(1).map((tab) => tab.id), ["a", "b"]);
  assert.equal(tabs[1].badge, "●1");
  assert.equal(isCockpitTab("cockpit"), true);
  assert.equal(isCockpitTab("a"), false);
});

test("project workspaces hide the permanent duplicate project rail", () => {
  assert.equal(railVisibility("cockpit"), true);
  assert.equal(railVisibility("project"), false);
});

test("compact active missions use TaskGraph as the primary workspace surface", () => {
  assert.equal(primaryWorkspaceSurface({ hasTaskGraph: true, width: 80 }), "taskgraph");
  assert.equal(primaryWorkspaceSurface({ hasTaskGraph: false, width: 80 }), "mission");
  assert.equal(primaryWorkspaceSurface({ hasTaskGraph: true, width: 140 }), "taskgraph");
});

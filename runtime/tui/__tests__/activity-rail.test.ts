import { describe, it, expect } from "bun:test";
import {
  createActivityRailModel,
  ActivityToolId,
  formatActivityRail
} from "../shell/activity-rail-model";

describe("Project Activity Rail (Level 2 Navigation)", () => {
  it("initializes with default tools and active selection", () => {
    const rail = createActivityRailModel({
      activeTool: "graph",
      attentionCount: 2,
      runningAgentCount: 1
    });

    expect(rail.tools.length).toBeGreaterThanOrEqual(7);
    expect(rail.activeTool).toBe("graph");
    expect(rail.tools.find((t) => t.id === "graph")?.label).toBe("Plan / Graph");
  });

  it("selects next and previous tool via keyboard navigation", () => {
    let rail = createActivityRailModel({ activeTool: "overview" });
    rail = rail.selectNext();
    expect(rail.activeTool).toBe("graph");

    rail = rail.selectNext();
    expect(rail.activeTool).toBe("agents");

    rail = rail.selectPrevious();
    expect(rail.activeTool).toBe("graph");
  });

  it("formats compact rail icon-only on narrow widths (80 columns)", () => {
    const rail = createActivityRailModel({ activeTool: "graph", attentionCount: 1 });
    const compactOutput = formatActivityRail(rail, { width: 4, compact: true });
    expect(compactOutput).toContain("◈");
    expect(compactOutput).not.toContain("Plan / Graph");
  });

  it("formats expanded rail with icons and labels on wide widths", () => {
    const rail = createActivityRailModel({ activeTool: "graph", attentionCount: 1 });
    const wideOutput = formatActivityRail(rail, { width: 18, compact: false });
    expect(wideOutput).toContain("◈ Plan / Graph");
    expect(wideOutput).toContain("⚠ Attention (1)");
  });
});

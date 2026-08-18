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

  it("assigns badges for attention count and running agents", () => {
    const rail = createActivityRailModel({ attentionCount: 5, runningAgentCount: 3 });
    const attention = rail.tools.find((t) => t.id === "attention");
    const agents = rail.tools.find((t) => t.id === "agents");
    expect(attention?.badge).toBe("5");
    expect(agents?.badge).toBe("3");
  });

  it("does not assign badges when counts are zero or absent", () => {
    const rail = createActivityRailModel({});
    const attention = rail.tools.find((t) => t.id === "attention");
    const agents = rail.tools.find((t) => t.id === "agents");
    expect(attention?.badge).toBeUndefined();
    expect(agents?.badge).toBeUndefined();
  });

  it("selects a specific tool via selectTool", () => {
    let rail = createActivityRailModel({ activeTool: "overview" });
    rail = rail.selectTool("verify");
    expect(rail.activeTool).toBe("verify");
    expect(rail.tools.find((t) => t.id === "verify")?.label).toBe("Verify");
  });

  it("wraps around when selecting next at the end of the rail", () => {
    let rail = createActivityRailModel({ activeTool: "verify" });
    rail = rail.selectNext();
    expect(rail.activeTool).toBe("overview");
  });
});

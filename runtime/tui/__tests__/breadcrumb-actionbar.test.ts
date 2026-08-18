import { describe, it, expect } from "bun:test";
import { deriveBreadcrumb, formatBreadcrumb } from "../shell/breadcrumb-model";
import { deriveActionBar, formatActionBar } from "../shell/action-bar-model";
import { createRegistry } from "../commands/registry";

describe("Breadcrumb & Action Bar Models", () => {
  it("derives precise hierarchical breadcrumb path", () => {
    const crumb = deriveBreadcrumb({
      projectName: "EscolaNet",
      missionTitle: "Produtos API",
      waveNumber: 3,
      selectedTaskId: "task-api"
    });

    expect(crumb.segments).toEqual(["EscolaNet", "Produtos API", "Wave 3", "task-api"]);
    expect(formatBreadcrumb(crumb)).toBe("EscolaNet › Produtos API › Wave 3 › task-api");
  });

  it("handles missing segments gracefully in breadcrumb", () => {
    const crumb = deriveBreadcrumb({
      projectName: "EscolaNet"
    });

    expect(crumb.segments).toEqual(["EscolaNet"]);
    expect(formatBreadcrumb(crumb)).toBe("EscolaNet");
  });

  it("falls back to Workspace when projectName is empty", () => {
    const crumb = deriveBreadcrumb({ projectName: "" });
    expect(crumb.segments).toEqual(["Workspace"]);
    expect(formatBreadcrumb(crumb)).toBe("Workspace");
  });

  it("derives contextual action bar actions (max 6)", () => {
    const registry = createRegistry({ includeDefaults: true });
    const bar = deriveActionBar({
      surface: "taskgraph",
      registry,
      state: { selectedTaskId: "task-1", canVerify: true }
    });

    expect(bar.actions.length).toBeLessThanOrEqual(6);
    expect(bar.actions.some((a) => a.key === "Enter")).toBe(true);

    const rendered = formatActionBar(bar);
    expect(rendered).toContain("Enter");
  });

  it("derives cockpit action bar: project select, mission, attention, palette, help", () => {
    const bar = deriveActionBar({ surface: "cockpit", registry: null, state: {} });

    expect(bar.actions.length).toBeLessThanOrEqual(6);
    expect(bar.actions.some((a) => a.key === "1-4" && a.label.includes("Select Project"))).toBe(true);
    expect(bar.actions.some((a) => a.key === "M" && a.label.includes("New Mission"))).toBe(true);
    expect(bar.actions.some((a) => a.key === "A" && a.label.includes("Attention"))).toBe(true);
    expect(bar.actions.some((a) => a.key === "Ctrl+K" && a.label.includes("Commands"))).toBe(true);

    const rendered = formatActionBar(bar);
    expect(rendered).toContain("1-4");
    expect(rendered).toContain("Ctrl+K");
  });

  it("derives skills action bar: attach, search, back", () => {
    const bar = deriveActionBar({ surface: "skills", registry: null, state: {} });

    expect(bar.actions.some((a) => a.key === "Enter" && a.label.includes("Attach Skill"))).toBe(true);
    expect(bar.actions.some((a) => a.key === "/" && a.label.includes("Search"))).toBe(true);
    expect(bar.actions.some((a) => a.key === "Esc" && a.label.includes("Back"))).toBe(true);
  });

  it("derives attention action bar: approve, reject, snooze, close", () => {
    const bar = deriveActionBar({ surface: "attention", registry: null, state: {} });

    expect(bar.actions.some((a) => a.key === "3" && a.label.includes("Approve"))).toBe(true);
    expect(bar.actions.some((a) => a.key === "4" && a.label.includes("Reject"))).toBe(true);
    expect(bar.actions.some((a) => a.key === "S" && a.label.includes("Snooze"))).toBe(true);
    expect(bar.actions.some((a) => a.key === "Esc" && a.label.includes("Close"))).toBe(true);
  });
});

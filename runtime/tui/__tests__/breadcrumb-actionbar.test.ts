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
});

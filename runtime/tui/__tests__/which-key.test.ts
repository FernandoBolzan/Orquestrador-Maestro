import { describe, it, expect } from "bun:test";
import { deriveWhichKeyContext, formatWhichKeyHelp } from "../commands/which-key-model";
import { createRegistry } from "../commands/registry";

describe("Which-Key & Contextual Help Generator", () => {
  it("derives contextual actions for TaskGraph surface", () => {
    const registry = createRegistry({ includeDefaults: true });
    const help = deriveWhichKeyContext({
      surface: "taskgraph",
      registry,
      state: { selectedTaskId: "task-1", hasRunningAgent: true }
    });

    expect(help.surfaceTitle).toBe("TASKGRAPH");
    expect(help.actions.some((a) => a.key === "Enter" && a.description.includes("Inspect"))).toBe(true);
    expect(help.actions.some((a) => a.key === "T" && a.description.includes("Terminal"))).toBe(true);
    expect(help.globals.some((g) => g.key === "Ctrl+K")).toBe(true);
    expect(help.globals.some((g) => g.key === "Ctrl+P")).toBe(true);
  });

  it("formats formatted help box with clear categories", () => {
    const registry = createRegistry({ includeDefaults: true });
    const help = deriveWhichKeyContext({
      surface: "taskgraph",
      registry,
      state: {}
    });

    const rendered = formatWhichKeyHelp(help, { width: 60 });
    expect(rendered).toContain("TASKGRAPH");
    expect(rendered).toContain("Actions");
    expect(rendered).toContain("Global");
  });
});

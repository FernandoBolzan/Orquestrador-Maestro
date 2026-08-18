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

  it("derives cockpit surface actions: project slots, mission, attention, shell, quit", () => {
    const help = deriveWhichKeyContext({ surface: "cockpit", registry: null, state: {} });

    expect(help.surfaceTitle).toBe("COCKPIT");
    expect(help.actions.some((a) => a.key === "1–4" && a.description.includes("Select Operational Project"))).toBe(true);
    expect(help.actions.some((a) => a.key === "M" && a.description.includes("Mission"))).toBe(true);
    expect(help.actions.some((a) => a.key === "A" && a.description.includes("Attention"))).toBe(true);
    expect(help.actions.some((a) => a.key === "S" && a.description.includes("Shell"))).toBe(true);
    expect(help.actions.some((a) => a.key === "Q" && a.description.includes("Quit"))).toBe(true);
    expect(help.globals.some((g) => g.key === "Ctrl+K")).toBe(true);
  });

  it("derives skills surface actions: navigate, attach, filter", () => {
    const help = deriveWhichKeyContext({ surface: "skills", registry: null, state: {} });

    expect(help.surfaceTitle).toBe("SKILLS");
    expect(help.actions.some((a) => a.key === "↑ / ↓" && a.description.includes("Navigate Skill Catalog"))).toBe(true);
    expect(help.actions.some((a) => a.key === "Enter" && a.description.includes("Inspect / Attach Skill"))).toBe(true);
    expect(help.actions.some((a) => a.key === "/" && a.description.includes("Filter Skills"))).toBe(true);
  });

  it("derives attention surface actions: approve, reject, snooze", () => {
    const help = deriveWhichKeyContext({ surface: "attention", registry: null, state: {} });

    expect(help.surfaceTitle).toBe("ATTENTION");
    expect(help.actions.some((a) => a.key === "3" && a.description.includes("Approve"))).toBe(true);
    expect(help.actions.some((a) => a.key === "4" && a.description.includes("Reject"))).toBe(true);
    expect(help.actions.some((a) => a.key === "S" && a.description.includes("Snooze"))).toBe(true);
  });

  it("formats help box for cockpit with actions section", () => {
    const help = deriveWhichKeyContext({ surface: "cockpit", registry: null, state: {} });
    const rendered = formatWhichKeyHelp(help, { width: 60 });
    expect(rendered).toContain("COCKPIT");
    expect(rendered).toContain("Actions");
    expect(rendered).toContain("Global");
  });
});

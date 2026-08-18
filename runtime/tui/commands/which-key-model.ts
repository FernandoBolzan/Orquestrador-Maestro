"use strict";

export interface WhichKeyAction {
  key: string;
  description: string;
  category: "Navigation" | "Actions" | "Global";
}

export interface WhichKeyContext {
  surfaceTitle: string;
  actions: WhichKeyAction[];
  globals: WhichKeyAction[];
}

export function deriveWhichKeyContext(options: {
  surface: string;
  registry?: any;
  state?: any;
}): WhichKeyContext {
  const surface = options.surface || "cockpit";
  const surfaceTitle = surface.toUpperCase();

  const actions: WhichKeyAction[] = [];
  const globals: WhichKeyAction[] = [
    { key: "Ctrl+K", description: "Universal Command Palette", category: "Global" },
    { key: "Ctrl+P", description: "Project Switcher", category: "Global" },
    { key: "?", description: "Context Help", category: "Global" },
    { key: "Tab", description: "Next Region", category: "Global" },
    { key: "Esc", description: "Back / Close Overlay", category: "Global" }
  ];

  if (surface === "taskgraph" || surface === "project") {
    actions.push(
      { key: "↑ / ↓", description: "Select Task", category: "Navigation" },
      { key: "Enter", description: "Inspect Selected Task", category: "Actions" },
      { key: "T", description: "Focus/Attach Agent Terminal", category: "Actions" },
      { key: "D", description: "View Task Code Changes / Diff", category: "Actions" },
      { key: "V", description: "Verify Task Acceptance Criteria", category: "Actions" },
      { key: "S", description: "Explore and Attach Skills", category: "Actions" }
    );
  } else if (surface === "cockpit") {
    actions.push(
      { key: "1–4", description: "Select Operational Project", category: "Navigation" },
      { key: "M", description: "Create New Engineering Mission", category: "Actions" },
      { key: "A", description: "Open Attention Center", category: "Actions" },
      { key: "S", description: "Launch Standalone Shell", category: "Actions" },
      { key: "Q", description: "Quit TUI (Preserves Daemon)", category: "Actions" }
    );
  } else if (surface === "skills") {
    actions.push(
      { key: "↑ / ↓", description: "Navigate Skill Catalog", category: "Navigation" },
      { key: "Enter", description: "Inspect / Attach Skill", category: "Actions" },
      { key: "/", description: "Filter Skills by Keyword", category: "Actions" }
    );
  } else if (surface === "attention") {
    actions.push(
      { key: "3", description: "Approve Gate Request", category: "Actions" },
      { key: "4", description: "Reject Gate Request", category: "Actions" },
      { key: "S", description: "Snooze Gate (15m)", category: "Actions" }
    );
  }

  const registered = options.registry?.getActiveKeys?.(null, options.state || {});
  if (Array.isArray(registered)) {
    for (const command of registered) {
      if (command?.shortcut && !actions.some((a) => a.key === command.shortcut)) {
        actions.push({ key: command.shortcut, description: command.title, category: "Actions" });
      }
    }
  }

  return {
    surfaceTitle,
    actions,
    globals
  };
}

export function formatWhichKeyHelp(context: WhichKeyContext, options: { width?: number } = {}): string {
  const width = options.width || 60;
  const line = "─".repeat(Math.max(20, width - 4));

  const navSection = context.actions.filter((a) => a.category === "Navigation");
  const actSection = context.actions.filter((a) => a.category === "Actions");
  const globSection = context.globals;

  const out: string[] = [
    `┌  ◆ WHICH-KEY: ${context.surfaceTitle} ${line}`,
    `│`
  ];

  if (navSection.length > 0) {
    out.push(`│  Navigation`);
    for (const a of navSection) {
      out.push(`│    ${a.key.padEnd(10)} ${a.description}`);
    }
    out.push(`│`);
  }

  if (actSection.length > 0) {
    out.push(`│  Actions`);
    for (const a of actSection) {
      out.push(`│    ${a.key.padEnd(10)} ${a.description}`);
    }
    out.push(`│`);
  }

  out.push(`│  Global`);
  for (const g of globSection) {
    out.push(`│    ${g.key.padEnd(10)} ${g.description}`);
  }

  out.push(`└${line}`);
  return out.join("\n");
}

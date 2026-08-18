"use strict";

export interface ActionItem {
  key: string;
  label: string;
  actionId: string;
}

export interface ActionBarModel {
  actions: ActionItem[];
}

export function deriveActionBar(options: {
  surface: string;
  registry?: any;
  state?: any;
}): ActionBarModel {
  const surface = options.surface || "cockpit";
  const actions: ActionItem[] = [];

  if (surface === "taskgraph" || surface === "project") {
    actions.push(
      { key: "Enter", label: "Inspect", actionId: "task.inspect" },
      { key: "T", label: "Terminal", actionId: "agent.terminal" },
      { key: "D", label: "Diff", actionId: "task.diff" },
      { key: "V", label: "Verify", actionId: "task.verify" },
      { key: "?", label: "Help", actionId: "help.contextual" }
    );
  } else if (surface === "cockpit") {
    actions.push(
      { key: "1-4", label: "Select Project", actionId: "project.select" },
      { key: "M", label: "New Mission", actionId: "mission.create" },
      { key: "A", label: "Attention", actionId: "attention.open" },
      { key: "Ctrl+K", label: "Commands", actionId: "palette.open" },
      { key: "?", label: "Help", actionId: "help.contextual" }
    );
  } else if (surface === "skills") {
    actions.push(
      { key: "Enter", label: "Attach Skill", actionId: "skill.attach" },
      { key: "/", label: "Search", actionId: "skill.search" },
      { key: "Esc", label: "Back", actionId: "workspace.back" }
    );
  } else if (surface === "attention") {
    actions.push(
      { key: "3", label: "Approve", actionId: "gate.approve" },
      { key: "4", label: "Reject", actionId: "gate.reject" },
      { key: "S", label: "Snooze 15m", actionId: "gate.snooze" },
      { key: "Esc", label: "Close", actionId: "gate.escape" }
    );
  }

  const registered = options.registry?.getActiveKeys?.(null, options.state || {});
  if (Array.isArray(registered)) {
    for (const command of registered) {
      if (command?.shortcut && !actions.some((a) => a.key === command.shortcut)) {
        actions.push({ key: command.shortcut, label: command.title, actionId: command.id });
      }
    }
  }

  return { actions: actions.slice(0, 6) };
}

export function formatActionBar(model: ActionBarModel): string {
  return model.actions.map((a) => `[${a.key}] ${a.label}`).join("   ");
}

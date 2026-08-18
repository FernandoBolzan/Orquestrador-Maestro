"use strict";

export type ActivityToolId =
  | "overview"
  | "graph"
  | "agents"
  | "terminal"
  | "skills"
  | "attention"
  | "changes"
  | "verify"
  | "history";

export interface ActivityTool {
  id: ActivityToolId;
  icon: string;
  label: string;
  badge?: string;
  shortcut?: string;
}

export interface ActivityRailModel {
  tools: ActivityTool[];
  activeTool: ActivityToolId;
  selectNext(): ActivityRailModel;
  selectPrevious(): ActivityRailModel;
  selectTool(id: ActivityToolId): ActivityRailModel;
}

const DEFAULT_TOOLS: ActivityTool[] = [
  { id: "overview", icon: "◎", label: "Overview", shortcut: "1" },
  { id: "graph", icon: "◈", label: "Plan / Graph", shortcut: "2" },
  { id: "agents", icon: "▶", label: "Agents", shortcut: "3" },
  { id: "terminal", icon: ">_", label: "Terminal", shortcut: "T" },
  { id: "skills", icon: "◆", label: "Skills", shortcut: "S" },
  { id: "attention", icon: "⚠", label: "Attention", shortcut: "A" },
  { id: "changes", icon: "±", label: "Changes", shortcut: "D" },
  { id: "verify", icon: "✓", label: "Verify", shortcut: "V" }
];

export function createActivityRailModel(options: {
  activeTool?: ActivityToolId;
  attentionCount?: number;
  runningAgentCount?: number;
} = {}): ActivityRailModel {
  const activeTool: ActivityToolId = options.activeTool || "graph";

  const tools: ActivityTool[] = DEFAULT_TOOLS.map((t) => {
    let badge: string | undefined = undefined;
    if (t.id === "attention" && options.attentionCount && options.attentionCount > 0) {
      badge = String(options.attentionCount);
    }
    if (t.id === "agents" && options.runningAgentCount && options.runningAgentCount > 0) {
      badge = String(options.runningAgentCount);
    }
    return { ...t, badge };
  });

  function selectTool(id: ActivityToolId): ActivityRailModel {
    return createActivityRailModel({
      activeTool: id,
      attentionCount: options.attentionCount,
      runningAgentCount: options.runningAgentCount
    });
  }

  function selectNext(): ActivityRailModel {
    const currentIndex = tools.findIndex((t) => t.id === activeTool);
    const nextIndex = (currentIndex + 1) % tools.length;
    return selectTool(tools[nextIndex].id);
  }

  function selectPrevious(): ActivityRailModel {
    const currentIndex = tools.findIndex((t) => t.id === activeTool);
    const prevIndex = (currentIndex - 1 + tools.length) % tools.length;
    return selectTool(tools[prevIndex].id);
  }

  return {
    tools,
    activeTool,
    selectNext,
    selectPrevious,
    selectTool
  };
}

export function formatActivityRail(
  model: ActivityRailModel,
  options: { width?: number; compact?: boolean } = {}
): string {
  const compact = options.compact ?? ((options.width || 80) < 100);

  return model.tools
    .map((tool) => {
      const isSelected = tool.id === model.activeTool;
      const marker = isSelected ? "▶" : " ";
      const badgeStr = tool.badge ? ` (${tool.badge})` : "";
      if (compact) {
        return `${marker}${tool.icon}`;
      }
      return `${marker} ${tool.icon} ${tool.label}${badgeStr}`;
    })
    .join("\n");
}

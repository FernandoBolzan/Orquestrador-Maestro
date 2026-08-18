"use strict";

import type { TaskGraphView } from "../shell/taskgraph-model.ts";
import { formatTaskGraphTree } from "../shell/taskgraph-model.ts";
import { createActivityRailModel, formatActivityRail, ActivityToolId } from "../shell/activity-rail-model.ts";
import { deriveBreadcrumb, formatBreadcrumb } from "../shell/breadcrumb-model.ts";
import { deriveActionBar, formatActionBar } from "../shell/action-bar-model.ts";

export type ProjectWorkspaceInput = Readonly<{
  project: Readonly<{ id: string; name: string; status?: string; verification?: { status?: string } }>;
  mission?: Readonly<{ id: string; objective: string; status: string; mode?: string; startedAt?: string }>;
  graph: TaskGraphView;
  activeTool?: ActivityToolId;
  selectedTaskId?: string;
  sessions?: readonly Readonly<{
    id: string;
    label: string;
    status: string;
    role?: string;
    providerId?: string;
    outputSnippet?: string;
  }>[];
  selectedSessionIndex?: number;
  attentionCount?: number;
  width: number;
  height: number;
}>;

export function renderProjectWorkspaceView(input: ProjectWorkspaceInput): string {
  const width = input.width || 120;
  const height = input.height || 36;
  const projectName = input.project.name || "Workspace";
  const mission = input.mission;
  const graph = input.graph;
  const sessions = input.sessions || [];
  const activeTool: ActivityToolId = input.activeTool || "graph";

  // Level 4: Breadcrumb Header
  const breadcrumbModel = deriveBreadcrumb({
    projectName,
    missionTitle: mission?.objective,
    waveNumber: graph.currentWave || undefined,
    selectedTaskId: input.selectedTaskId
  });
  const breadcrumbStr = formatBreadcrumb(breadcrumbModel);

  // Level 2: Activity Rail
  const railModel = createActivityRailModel({
    activeTool,
    attentionCount: input.attentionCount,
    runningAgentCount: sessions.filter((s) => s.status === "running" || s.status === "active").length
  });
  const railStr = formatActivityRail(railModel, { width: 18, compact: width < 110 });

  // Level 4: Action Bar
  const actionBarModel = deriveActionBar({ surface: "taskgraph" });
  const actionBarStr = formatActionBar(actionBarModel);

  if (!graph.tasks.length && !sessions.length) {
    return `${breadcrumbStr}\n${"─".repeat(Math.min(width, 80))}\n\n[Activity Rail]\n${railStr}\n\nNo active TaskGraph\nOpen Plan or create a mission to begin.\n\n${actionBarStr}`;
  }

  const graphTree = formatTaskGraphTree(graph);

  // Compact layout (<90 cols)
  if (width < 90) {
    const sessionSummary = sessions.length
      ? `\nAGENTS (${sessions.length}): ${sessions.map((s) => `${s.label} [${s.status}]`).join(", ")}`
      : "";
    return `${breadcrumbStr}\n${"─".repeat(width)}\n\n${graphTree}${sessionSummary}\n\n${actionBarStr}`;
  }

  // Wide layout (90 - 159 cols)
  if (width < 160) {
    const leftCol = `TASKGRAPH (PLAN)\n${graphTree}`;
    const activeSession = sessions[input.selectedSessionIndex || 0] || sessions[0];
    const rightCol = activeSession
      ? `AGENT TERMINAL: ${activeSession.label} [${activeSession.providerId || "agent"}] (${activeSession.status})\n${activeSession.outputSnippet || "Aguardando output..."}`
      : "INSPECTOR\nNenhum agente em execução.";

    return `${breadcrumbStr}\n${"─".repeat(Math.min(width, 100))}\n\n[RAIL]\n${railStr}\n\n${leftCol}\n\n${"-".repeat(40)}\n\n${rightCol}\n\n${actionBarStr}`;
  }

  // Ultrawide layout (>= 160 cols)
  const leftCol = `TASKGRAPH (PLAN)\n${graphTree}`;
  const midCol = sessions.length
    ? `AGENTS & TERMINALS (${sessions.length})\n${sessions
        .map(
          (s, idx) =>
            `${idx === (input.selectedSessionIndex || 0) ? "▸" : " "} ${s.role || "AGENT"}: ${s.label} [${s.status}]\n  ${s.outputSnippet || "Idle"}`
        )
        .join("\n\n")}`
    : "AGENTS\n0 active agents.";

  const rightCol = `PROJECT INSPECTOR\nStatus: ${input.project.status || "idle"}\nVerification: ${
    input.project.verification?.status || "pending"
  }\nCritical Path: ${graph.criticalPath.join(" → ") || "none"}`;

  return `${breadcrumbStr}\n${"─".repeat(Math.min(width, 140))}\n\n[RAIL]\n${railStr}\n\n[PLAN / GRAPH]\n${leftCol}\n\n[TERMINALS]\n${midCol}\n\n[INSPECTOR]\n${rightCol}\n\n${actionBarStr}`;
}

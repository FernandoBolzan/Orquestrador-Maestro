import type { TaskGraphView } from "../shell/taskgraph-model.ts";
import { formatTaskGraphTree } from "../shell/taskgraph-model.ts";

export type ProjectWorkspaceInput = Readonly<{
  project: Readonly<{ id: string; name: string; status?: string; verification?: { status?: string } }>;
  mission?: Readonly<{ id: string; objective: string; status: string; mode?: string; startedAt?: string }>;
  graph: TaskGraphView;
  sessions?: readonly Readonly<{
    id: string;
    label: string;
    status: string;
    role?: string;
    providerId?: string;
    outputSnippet?: string;
  }>[];
  selectedSessionIndex?: number;
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

  // Header line
  const missionTitle = mission
    ? `MISSÃO: ${mission.objective} [${mission.status.toUpperCase()}]`
    : "NENHUMA MISSÃO ATIVA";

  if (!graph.tasks.length && !sessions.length) {
    return `${projectName.toUpperCase()} · WORKSPACE\n${missionTitle}\n\nNo active TaskGraph\n\nOpen Plan or create a mission to begin.`;
  }

  const graphTree = formatTaskGraphTree(graph);

  // Compact layout (<90 cols)
  if (width < 90) {
    const sessionSummary = sessions.length
      ? `\nAGENTS (${sessions.length}): ${sessions.map((s) => `${s.label} [${s.status}]`).join(", ")}`
      : "";
    return `${projectName.toUpperCase()} · WORKSPACE\n${missionTitle}\n\n${graphTree}${sessionSummary}`;
  }

  // Wide layout (120 - 159 cols)
  if (width < 160) {
    const leftCol = `TASKGRAPH (PLAN)\n${graphTree}`;
    const activeSession = sessions[input.selectedSessionIndex || 0] || sessions[0];
    const rightCol = activeSession
      ? `AGENT TERMINAL: ${activeSession.label} [${activeSession.providerId || "agent"}] (${activeSession.status})\n${activeSession.outputSnippet || "Aguardando output..."}`
      : "INSPECTOR\nNenhum agente em execução.";

    return `${projectName.toUpperCase()} · WORKSPACE   |   ${missionTitle}\n${"=".repeat(Math.min(width, 100))}\n\n${leftCol}\n\n${"-".repeat(40)}\n\n${rightCol}`;
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

  return `${projectName.toUpperCase()} · ULTRAWIDE WORKSPACE   |   ${missionTitle}\n${"=".repeat(Math.min(width, 140))}\n\n[PLAN / GRAPH]\n${leftCol}\n\n[TERMINALS]\n${midCol}\n\n[INSPECTOR]\n${rightCol}`;
}

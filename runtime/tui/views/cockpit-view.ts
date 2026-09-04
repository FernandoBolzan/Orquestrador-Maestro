import type { CockpitModel } from "../shell/cockpit-model.ts";
import { focusGrammar } from "../shell/layout-model.ts";

function projectLine(project: CockpitModel["projects"][number], selectedId?: string): string {
  const status = String(project.status || "idle").toLowerCase();
  const marker = project.attentionCount
    ? "⚠"
    : status === "running" || project.running > 0
    ? "●"
    : status === "completed"
    ? "✓"
    : "○";

  const focus = focusGrammar({
    entityType: "task",
    selected: project.id === selectedId,
    focused: project.id === selectedId,
    attention: project.attentionCount > 0,
    running: project.running > 0,
  });

  const progress = typeof project.progress === "number" ? ` ${Math.max(0, Math.min(100, project.progress))}%` : "";
  const detail = [
    project.running ? `${project.running} running` : "idle",
    project.blocked ? `${project.blocked} blocked` : "",
    project.agents ? `${project.agents} agent${project.agents === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return `${focus.marker === "▸" ? "▸" : " "}${marker} ${project.name}${progress}${detail ? ` · ${detail}` : ""}`;
}

export function renderCockpitView(model: CockpitModel, width: number, selectedId?: string): string {
  const projects =
    model.projects.map((project) => projectLine(project, selectedId)).join("\n") || "Nenhum projeto registrado.";

  const attention = model.attention.length
    ? model.attention
        .slice(0, width >= 160 ? 6 : width >= 120 ? 4 : 2)
        .map(
          (item) =>
            `⚠ ${String(item.projectId || "global")} · ${String(item.title || item.reason || "decisão necessária")}`
        )
        .join("\n")
    : "Nenhuma intervenção pendente.";

  const execution = `${model.execution.running} running · ${model.execution.ready} ready · ${model.execution.blocked} blocked · ${model.execution.agents} agents`;
  const activity = model.activity.length
    ? model.activity
        .slice(-4)
        .map((item) => `· ${String(item.text || item.type || "atividade")}`)
        .join("\n")
    : "Nenhuma atividade recente.";

  const runtimeLine = `Runtime: ${model.runtime.connected ? "● conectado" : "◌ local"} · ${model.projects.length} projetos monitorados`;

  // Compact layout (<90 cols, e.g. 80x24)
  if (width < 90) {
    return `ACTIVE PROJECTS\n${projects}\n\nATTENTION (${model.attentionCount})\n${attention}\n\nEXECUTION\n${execution}\n${runtimeLine}`;
  }

  // Standard layout (90 - 119 cols, e.g. 100x30)
  if (width < 120) {
    return `PROJECTS\n${projects}\n\nACTIVE EXECUTION\n${execution}\n\nATTENTION (${model.attentionCount})\n${attention}\n\nACTIVITY\n${activity}\n\n${runtimeLine}`;
  }

  // Wide layout (120 - 159 cols, e.g. 140x40)
  if (width < 160) {
    return `PROJECTS & EXECUTION\n${projects}\n\nEXECUTION METRICS\n${execution}\n\nATTENTION (${model.attentionCount})\n${attention}\n\nRECENT ACTIVITY\n${activity}\n\nRUNTIME HEALTH\n${runtimeLine}`;
  }

  // Ultrawide layout (>=160 cols, e.g. 180x50) - multi-region recomposition
  const col1 = `[PROJECTS & EXECUTION]\n${projects}\n\nMetrics: ${execution}`;
  const col2 = `[ACTIVE AGENTS & LANES]\nTotal Agents: ${model.execution.agents}\nParallel Lanes: ${model.execution.parallelLanes}\nRunning Projects: ${model.runningProjects.map((p) => p.name).join(", ") || "none"}`;
  const col3 = `[ATTENTION SUMMARY (${model.attentionCount})]\n${attention}`;
  const col4 = `[RECENT ACTIVITY]\n${activity}\n\n[RUNTIME HEALTH]\n${runtimeLine}`;

  return `MAESTRO COCKPIT · GLOBAL OPERATIONS (ULTRAWIDE)\n${"=".repeat(Math.min(width, 160))}\n\n${col1}\n\n${"-".repeat(60)}\n\n${col2}\n\n${"-".repeat(60)}\n\n${col3}\n\n${"-".repeat(60)}\n\n${col4}`;
}

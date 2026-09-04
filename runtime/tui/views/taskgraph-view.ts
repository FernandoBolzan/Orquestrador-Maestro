import type { TaskGraphView } from "../shell/taskgraph-model.ts";

const marker = (status: unknown) => {
  const value = String(status || "ready").toLowerCase();
  return value === "completed" || value === "done" ? "✓" : value === "running" ? "●" : value === "blocked" ? "⊘" : value === "failed" ? "✕" : "○";
};

export function renderTaskGraphView(graph: TaskGraphView, width: number): string {
  if (!graph.tasks.length) return "No active TaskGraph\n\nOpen Plan or create a mission.";
  const lines = graph.waves.map((wave) => {
    const parallel = graph.parallelGroups.some((group) => group.some((id) => wave.ids.includes(id)));
    const header = `Wave ${wave.index}${parallel ? " · parallel" : ""}`;
    const tasks = wave.ids.map((id) => {
      const task = graph.tasks.find((entry) => entry.id === id);
      if (!task) return `  ○ ${id}`;
      const blocked = task.blockedBy.length ? ` waits ${task.blockedBy.join(",")}` : "";
      return `  ${marker(task.status)} ${String(task.title || task.name || task.id).slice(0, Math.max(18, width - 28))}${blocked}`;
    });
    return `${header}\n${tasks.join("\n")}`;
  });
  const parallel = graph.parallelGroups.length ? `\nParallel: ${graph.parallelGroups.map((group) => group.join(" + ")).join(" · ")}` : "";
  const next = graph.nextRunnable.length ? `\nNext: ${graph.nextRunnable.join(", ")}` : "";
  return `${lines.join("\n\n")}${parallel}${next}`;
}

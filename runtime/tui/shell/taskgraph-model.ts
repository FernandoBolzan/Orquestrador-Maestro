export type RawTask = Readonly<{
  id: string;
  title?: string;
  name?: string;
  lane?: string;
  status?: string;
  dependsOn?: readonly string[];
}>;

export type DerivedTask = RawTask & Readonly<{
  blockedBy: readonly string[];
  wave: number;
}>;

export type WaveGroup = Readonly<{
  index: number;
  ids: readonly string[];
  lanes: readonly string[];
  parallel: boolean;
}>;

export type TaskGraphView = Readonly<{
  tasks: readonly DerivedTask[];
  waves: readonly WaveGroup[];
  parallelGroups: readonly (readonly string[])[];
  criticalPath: readonly string[];
  currentWave: number;
  nextRunnable: readonly string[];
}>;

export function deriveTaskGraph(rawTasks: readonly RawTask[]): TaskGraphView {
  if (!rawTasks.length) {
    return Object.freeze({
      tasks: Object.freeze([]),
      waves: Object.freeze([]),
      parallelGroups: Object.freeze([]),
      criticalPath: Object.freeze([]),
      currentWave: 0,
      nextRunnable: Object.freeze([]),
    });
  }

  const byId = new Map(rawTasks.map((task) => [task.id, task]));
  const waveOf = new Map<string, number>();
  const visiting = new Set<string>();

  const computeWave = (id: string): number => {
    if (waveOf.has(id)) return waveOf.get(id) as number;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const task = byId.get(id);
    const deps = task?.dependsOn || [];
    const value = deps.length ? Math.max(...deps.map((dependency) => computeWave(dependency) + 1)) : 0;
    visiting.delete(id);
    waveOf.set(id, value);
    return value;
  };

  rawTasks.forEach((task) => computeWave(task.id));

  const tasks: readonly DerivedTask[] = Object.freeze(
    rawTasks.map((task) => {
      const blockedBy = Object.freeze(
        (task.dependsOn || []).filter((dependency) => {
          const status = String(byId.get(dependency)?.status || "").toLowerCase();
          return status !== "completed" && status !== "done";
        })
      );
      return Object.freeze({
        ...task,
        blockedBy,
        wave: (waveOf.get(task.id) || 0) + 1,
      });
    })
  );

  const waveMap = new Map<number, string[]>();
  tasks.forEach((task) => waveMap.set(task.wave, [...(waveMap.get(task.wave) || []), task.id]));

  const waves: readonly WaveGroup[] = Object.freeze(
    [...waveMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, ids]) => {
        const lanes = [...new Set(ids.map((id) => byId.get(id)?.lane || "default"))];
        return Object.freeze({
          index,
          ids: Object.freeze(ids),
          lanes: Object.freeze(lanes),
          parallel: ids.length > 1,
        });
      })
  );

  // Parallel groups: tasks in the same wave that run or can run in parallel
  const parallelGroups: readonly (readonly string[])[] = Object.freeze(
    waves
      .filter((w) => w.ids.length > 1)
      .map((w) => Object.freeze([...w.ids]))
  );

  // Next runnable: tasks that are not yet completed/running, but whose blockedBy is empty
  const nextRunnable = Object.freeze(
    tasks
      .filter((task) => {
        const status = String(task.status || "ready").toLowerCase();
        return ["ready", "queued", "pending"].includes(status) && task.blockedBy.length === 0;
      })
      .map((task) => task.id)
  );

  // Critical path: longest dependency path from root to leaf
  let longestChain: string[] = [];
  const findLongest = (id: string, current: string[]) => {
    const next = [...current, id];
    const dependents = tasks.filter((t) => (t.dependsOn || []).includes(id));
    if (!dependents.length) {
      if (next.length > longestChain.length) longestChain = next;
      return;
    }
    for (const dep of dependents) {
      findLongest(dep.id, next);
    }
  };

  const roots = tasks.filter((t) => !(t.dependsOn || []).length);
  for (const root of roots) {
    findLongest(root.id, []);
  }

  // Determine current active wave: lowest wave index with incomplete tasks
  const incompleteWave = waves.find((w) =>
    w.ids.some((id) => {
      const s = String(byId.get(id)?.status || "").toLowerCase();
      return s !== "completed" && s !== "done";
    })
  );
  const currentWave = incompleteWave ? incompleteWave.index : waves.length;

  return Object.freeze({
    tasks,
    waves,
    parallelGroups,
    criticalPath: Object.freeze(longestChain),
    currentWave,
    nextRunnable,
  });
}

const statusMarker = (status?: string) => {
  const value = String(status || "ready").toLowerCase();
  return value === "completed" || value === "done"
    ? "✓"
    : value === "running"
    ? "●"
    : value === "blocked"
    ? "⊘"
    : value === "failed"
    ? "✕"
    : "○";
};

export function formatTaskGraphTree(graph: TaskGraphView): string {
  if (!graph.tasks.length) return "No active TaskGraph\n\nOpen Plan or create a mission to begin.";

  const waveBlocks = graph.waves.map((wave) => {
    const isCurrent = wave.index === graph.currentWave;
    const waveHeader = `Wave ${wave.index} · ${wave.ids.length} task${wave.ids.length === 1 ? "" : "s"}${
      wave.parallel ? " (parallel)" : ""
    }${isCurrent ? " [CURRENT]" : ""}`;

    const taskLines = wave.ids.map((id) => {
      const task = graph.tasks.find((t) => t.id === id);
      if (!task) return `  ○ ${id}`;
      const lane = task.lane ? `[${task.lane}] ` : "";
      const blocked = task.blockedBy.length ? ` (waits ${task.blockedBy.join(", ")})` : "";
      return `  ${statusMarker(task.status)} ${lane}${task.title || task.name || task.id}${blocked}`;
    });

    return `${waveHeader}\n${taskLines.join("\n")}`;
  });

  const parallelSummary = graph.parallelGroups.length
    ? `\nParallel: ${graph.parallelGroups.map((g) => g.join(" + ")).join(" · ")}`
    : "";
  const nextSummary = graph.nextRunnable.length ? `\nNext: ${graph.nextRunnable.join(", ")}` : "";

  return `${waveBlocks.join("\n\n")}${parallelSummary}${nextSummary}`;
}

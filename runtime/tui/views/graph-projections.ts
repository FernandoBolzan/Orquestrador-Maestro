export type GraphTask = { id: string; title?: string; status?: string; capability?: string; wave?: number; [key: string]: unknown };
export type TaskGraphView = { id: string; missionId: string; tasks: readonly GraphTask[]; dependencies: Readonly<Record<string, readonly string[]>> };
export type ProjectedTask = Readonly<{ id: string; title: string; status: string; deps: readonly string[]; shown: boolean; depth?: number; lane?: string }>;

const STATUS_ORDER: Readonly<Record<string, number>> = Object.freeze({ running: 0, ready: 1, blocked: 2, failed: 3, verifying: 4, completed: 5, done: 5 });
function project(graph: TaskGraphView, task: GraphTask): ProjectedTask {
  const deps = graph.dependencies[task.id] || [];
  const valid = deps.every((id) => graph.tasks.some((candidate) => candidate.id === id));
  return Object.freeze({ id: task.id, title: String(task.title || task.id), status: valid ? String(task.status || "ready") : "invalid-dep", deps: Object.freeze([...deps]), shown: true });
}
export function compactProjection(graph: TaskGraphView, focusId?: string): ProjectedTask[] {
  const tasks = graph.tasks.map((task, index) => ({ task: project(graph, task), index }));
  tasks.sort((a, b) => (a.task.id === focusId ? -1 : b.task.id === focusId ? 1 : (STATUS_ORDER[a.task.status] ?? 4) - (STATUS_ORDER[b.task.status] ?? 4) || a.index - b.index));
  return tasks.map((entry) => entry.task);
}
export function treeProjection(graph: TaskGraphView, root?: string): ProjectedTask[] {
  const children = new Map<string, string[]>();
  for (const task of graph.tasks) for (const dep of graph.dependencies[task.id] || []) children.set(dep, [...(children.get(dep) || []), task.id]);
  const roots = root ? [root] : graph.tasks.filter((task) => !(graph.dependencies[task.id] || []).length).map((task) => task.id);
  const byId = new Map(graph.tasks.map((task) => [task.id, task])); const output: ProjectedTask[] = []; const seen = new Set<string>();
  const visit = (id: string, depth: number) => { if (seen.has(id)) return; seen.add(id); const task = byId.get(id); if (task) output.push(Object.freeze({ ...project(graph, task), depth })); for (const child of children.get(id) || []) visit(child, depth + 1); };
  for (const id of roots) visit(id, 0); for (const task of graph.tasks) visit(task.id, 0); return output;
}
export function wavesProjection(graph: TaskGraphView) {
  const waves = new Map<string, number>(); const invalid = new Set<string>();
  const compute = (id: string, stack = new Set<string>()): number => {
    if (waves.has(id)) return waves.get(id) as number; if (stack.has(id)) { invalid.add(id); return 0; }
    const deps = graph.dependencies[id] || []; if (deps.some((dep) => !graph.tasks.some((task) => task.id === dep))) { invalid.add(id); return 0; }
    const nextStack = new Set(stack).add(id); const wave = deps.length ? Math.max(...deps.map((dep) => compute(dep, nextStack))) + 1 : 1; waves.set(id, wave); return wave;
  };
  for (const task of graph.tasks) compute(task.id);
  const validWaveNumbers = [...new Set([...waves.values()].filter((wave) => wave > 0))].sort((a, b) => a - b);
  const result = validWaveNumbers.map((wave) => Object.freeze({ wave, valid: true, tasks: graph.tasks.filter((task) => waves.get(task.id) === wave).map((task) => project(graph, task)) }));
  if (invalid.size) result.push(Object.freeze({ wave: 0, valid: false, tasks: graph.tasks.filter((task) => invalid.has(task.id)).map((task) => Object.freeze({ ...project(graph, task), status: "invalid-dep" })) }));
  return result;
}
export function lanesProjection(graph: TaskGraphView, lanes: "capability" | "wave") {
  if (lanes === "wave") return wavesProjection(graph).map((entry) => ({ lane: `wave-${entry.wave}`, tasks: entry.tasks }));
  const groups = new Map<string, ProjectedTask[]>(); for (const task of graph.tasks) { const lane = String(task.capability || "other"); groups.set(lane, [...(groups.get(lane) || []), Object.freeze({ ...project(graph, task), lane })]); }
  return [...groups].map(([lane, tasks]) => Object.freeze({ lane, tasks: Object.freeze(tasks) }));
}

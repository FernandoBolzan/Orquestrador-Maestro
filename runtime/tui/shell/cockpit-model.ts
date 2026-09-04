export type CockpitProjectInput = Readonly<{
  id: string;
  name: string;
  path?: string;
  progress?: number;
  running?: number;
  ready?: number;
  blocked?: number;
  agents?: number;
  attention?: number;
  status?: string;
  autonomy?: string;
}>;

export type CockpitProjectState = CockpitProjectInput & Readonly<{
  progress: number;
  running: number;
  ready: number;
  blocked: number;
  agents: number;
  attentionCount: number;
}>;

export type CockpitModel = Readonly<{
  scope: "global";
  projects: readonly CockpitProjectState[];
  blockedProjects: readonly CockpitProjectState[];
  needsAttentionProjects: readonly CockpitProjectState[];
  runningProjects: readonly CockpitProjectState[];
  attention: readonly Record<string, unknown>[];
  attentionCount: number;
  attentionDetailOpen: false;
  execution: Readonly<{
    running: number;
    ready: number;
    blocked: number;
    agents: number;
    complete: number;
    parallelLanes: number;
  }>;
  activity: readonly Record<string, unknown>[];
  runtime: Readonly<{ connected: boolean }>;
}>;

export function buildCockpitModel(
  snapshot: Readonly<{
    runtime: { connected: boolean };
    projects: readonly CockpitProjectInput[];
    attention?: readonly Record<string, unknown>[];
    activity?: readonly Record<string, unknown>[];
  }>,
  _width = 120
): CockpitModel {
  const projects: readonly CockpitProjectState[] = Object.freeze(
    snapshot.projects.map((project) =>
      Object.freeze({
        ...project,
        progress: typeof project.progress === "number" ? Math.max(0, Math.min(100, project.progress)) : 0,
        running: Number(project.running || 0),
        ready: Number(project.ready || 0),
        blocked: Number(project.blocked || 0),
        agents: Number(project.agents || 0),
        attentionCount: Number(project.attention || 0),
      })
    )
  );

  const attention = Object.freeze([...(snapshot.attention || [])]);
  const blockedProjects = Object.freeze(
    projects.filter((p) => p.blocked > 0 || String(p.status).toLowerCase() === "blocked")
  );
  const needsAttentionProjects = Object.freeze(
    projects.filter((p) => p.attentionCount > 0 || String(p.status).toLowerCase() === "attention")
  );
  const runningProjects = Object.freeze(
    projects.filter((p) => p.running > 0 || String(p.status).toLowerCase() === "running")
  );

  const totalRunning = projects.reduce((sum, p) => sum + p.running, 0);
  const totalAgents = projects.reduce((sum, p) => sum + p.agents, 0);

  return Object.freeze({
    scope: "global",
    projects,
    blockedProjects,
    needsAttentionProjects,
    runningProjects,
    attention,
    attentionCount: attention.length,
    attentionDetailOpen: false,
    execution: Object.freeze({
      running: totalRunning,
      ready: projects.reduce((sum, p) => sum + p.ready, 0),
      blocked: projects.reduce((sum, p) => sum + p.blocked, 0),
      agents: totalAgents,
      complete: projects.filter((p) => String(p.status).toLowerCase() === "completed").length,
      parallelLanes: projects.filter((p) => p.running > 1).length,
    }),
    activity: Object.freeze([...(snapshot.activity || [])].slice(-8)),
    runtime: Object.freeze({ connected: Boolean(snapshot.runtime.connected) }),
  });
}

"use strict";

async function resolveRunContext({ store, graphs, semanticTaskId } = {}) {
  if (!semanticTaskId) throw new Error("UNRESOLVED_RUN_CONTEXT: semanticTaskId is required");
  const linked = await graphs?.missionForTask?.(semanticTaskId);
  const task = linked ? null : await store?.getTask?.(semanticTaskId);
  const missionId = linked?.missionId || task?.metadata?.missionId;
  const graphId = linked?.graphId || task?.metadata?.graphId;
  if (!missionId) throw new Error(`UNRESOLVED_RUN_CONTEXT: ${semanticTaskId}`);
  const mission = await store.getMission(missionId);
  const projectId = linked?.projectId || task?.projectId || mission?.projectId;
  if (!projectId) throw new Error(`UNRESOLVED_RUN_CONTEXT: ${semanticTaskId}`);
  const project = typeof store.getProject === "function" ? await store.getProject(projectId) : undefined;
  return {
    projectId,
    missionId,
    taskId: semanticTaskId,
    graphId,
    ...(project?.path ? { workspacePath: project.path } : {})
  };
}

function enrichedRunRequest(context, request = {}) {
  return {
    ...request,
    projectId: context.projectId,
    missionId: context.missionId,
    semanticTaskId: context.taskId,
    graphId: context.graphId,
    metadata: {
      ...(request.metadata || {}),
      missionId: context.missionId,
      semanticTaskId: context.taskId,
      projectId: context.projectId,
      graphId: context.graphId
    }
  };
}

module.exports = { enrichedRunRequest, resolveRunContext };

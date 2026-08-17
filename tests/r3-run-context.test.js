"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveRunContext, enrichedRunRequest } = require("../runtime/runs/run-context");

test("F5.1 resolve contexto explícito sem consultar cwd e enriquece request", async () => {
  let cwdCalls = 0;
  const originalCwd = process.cwd;
  process.cwd = () => { cwdCalls += 1; return "/wrong"; };
  try {
    const graphs = { missionForTask: async () => ({ missionId: "m1", projectId: "p1", graphId: "g1" }) };
    const store = {
      getTask: async () => ({ id: "t1" }),
      getMission: async () => ({ id: "m1", projectId: "p1" }),
      getProject: async () => ({ id: "p1", path: "/workspace/project" })
    };
    const context = await resolveRunContext({ store, graphs, semanticTaskId: "t1" });
    assert.deepEqual(context, { projectId: "p1", missionId: "m1", taskId: "t1", graphId: "g1", workspacePath: "/workspace/project" });
    assert.equal(cwdCalls, 0);
    assert.deepEqual(enrichedRunRequest(context, { description: "x", metadata: { keep: true } }), {
      description: "x",
      projectId: "p1",
      missionId: "m1",
      semanticTaskId: "t1",
      graphId: "g1",
      metadata: { keep: true, missionId: "m1", semanticTaskId: "t1", projectId: "p1", graphId: "g1" }
    });
  } finally {
    process.cwd = originalCwd;
  }
});

test("F5.1 rejeita task não vinculada", async () => {
  await assert.rejects(
    resolveRunContext({ store: { getTask: async () => undefined }, graphs: { missionForTask: async () => undefined }, semanticTaskId: "missing" }),
    /UNRESOLVED_RUN_CONTEXT/
  );
});

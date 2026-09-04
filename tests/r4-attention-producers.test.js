"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { AttentionProducers } = require("../runtime/attention/attention-producers");

test("F7.2 produtores criam atenção somente para gates humanos reais", async () => {
  const calls = [];
  const queue = { add: async (input) => { calls.push(input); return input; } };
  const producers = new AttentionProducers({ queue, projectId: "p1" });
  await producers.humanApprovalRequest({ missionId: "m1", taskGraphId: "g1", evalResult: { blockers: ["policy"] } });
  await producers.humanInputRequired({ missionId: "m1", dimensions: ["database"] });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.type), ["APPROVAL", "QUESTION"]);
  assert.ok(calls.every((call) => call.projectId === "p1" && call.status === undefined));
});

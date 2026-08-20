"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createTaskBlock } = require("../runtime/attention/task-block");
const { AttentionPolicy } = require("../runtime/attention/attention-policy");

test("R5 — TaskBlock: Validates typed kinds and recoverability levels", () => {
  const block = createTaskBlock({
    source: "dependency-analyzer",
    kind: "dependency",
    recoverability: "AUTOMATIC",
    reason: "Aguardando conclusão da tarefa dependente task-1"
  });

  assert.strictEqual(block.kind, "task_block");
  assert.strictEqual(block.blockKind, "dependency");
  assert.strictEqual(block.recoverability, "AUTOMATIC");
  assert.strictEqual(block.reason, "Aguardando conclusão da tarefa dependente task-1");
  assert.strictEqual(block.recurrence, 1);
});

test("R5 — AttentionPolicy: Auto-retries recoverable blocks without creating attention spam", async () => {
  const queue = { items: [], add: async (item) => queue.items.push(item) };
  const policy = new AttentionPolicy({ queue, maxAutoRetries: 3 });

  const retryableBlock = createTaskBlock({
    source: "network",
    kind: "transient",
    recoverability: "RETRYABLE",
    reason: "Timeout passageiro de rede"
  });

  const eval1 = await policy.evaluateTaskBlock(retryableBlock, { attempts: 1 });
  assert.strictEqual(eval1.requiresAttention, false);
  assert.strictEqual(eval1.action, "retry");
  assert.strictEqual(queue.items.length, 0);
});

test("R5 — AttentionPolicy: Human-required block generates explainable Attention item with evidence and actions", async () => {
  const queue = { items: [], add: async (item) => queue.items.push(item) };
  const policy = new AttentionPolicy({ queue, maxAutoRetries: 3 });

  const humanBlock = createTaskBlock({
    source: "governance",
    kind: "approval",
    recoverability: "HUMAN_REQUIRED",
    reason: "Alteração de schema de banco de dados requer autorização do operador"
  });

  const evalResult = await policy.evaluateTaskBlock(humanBlock, {
    projectId: "proj-alpha",
    missionId: "mission-beta",
    taskId: "task-gamma",
    risk: "Impacto em produção se migração falhar",
    impact: "Pipeline de deploy pausado"
  });

  assert.strictEqual(evalResult.requiresAttention, true);
  assert.strictEqual(queue.items.length, 1);

  const item = queue.items[0];
  assert.strictEqual(item.type, "APPROVAL");
  assert.strictEqual(item.projectId, "proj-alpha");
  assert.strictEqual(item.missionId, "mission-beta");
  assert.strictEqual(item.taskId, "task-gamma");
  assert.strictEqual(item.risk, "Impacto em produção se migração falhar");
  assert.strictEqual(item.impact, "Pipeline de deploy pausado");
  assert.ok(Array.isArray(item.whatTried));
  assert.ok(Array.isArray(item.actions));
  assert.ok(item.recommendation);
});

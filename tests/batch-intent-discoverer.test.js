"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { BatchIntentDiscoverer } = require("../runtime/planner/batch-intent-discoverer.js");
const { validateQuestionSet } = require("../runtime/planner/question-set-validator.js");

function makeFakeProvider(response) {
  return {
    detect: () => true,
    execute: async () => ({
      pid: "fake",
      cancel: () => {},
      result: Promise.resolve({
        stdout: JSON.stringify(response),
        stderr: "",
        exitCode: 0
      })
    })
  };
}

function makeFakeProviderRaw(text) {
  return {
    detect: () => true,
    execute: async () => ({
      pid: "fake",
      cancel: () => {},
      result: Promise.resolve({
        stdout: text,
        stderr: "",
        exitCode: 0
      })
    })
  };
}

test("BatchIntentDiscoverer: builds discovery prompt with context", async () => {
  let capturedPrompt = "";
  const provider = {
    detect: () => true,
    execute: async ({ prompt }) => {
      capturedPrompt = prompt;
      return {
        pid: "fake",
        cancel: () => {},
        result: Promise.resolve({
          stdout: JSON.stringify({ questions: [] }),
          stderr: "",
          exitCode: 0
        })
      };
    }
  };
  const discoverer = new BatchIntentDiscoverer({ provider });
  await discoverer.discover("quero crud", { requirements: [], constraints: [] }, [], {});
  assert.ok(capturedPrompt.includes("quero crud"));
  assert.ok(capturedPrompt.includes("questions"));
});

test("BatchIntentDiscoverer: parses questions from AI response", async () => {
  const response = {
    questions: [
      {
        id: "q1",
        unknownId: "u1",
        dimension: "scope",
        group: "scope",
        text: "Qual o escopo?",
        answerType: "single-choice",
        options: [
          { value: "backend", label: "Backend" },
          { value: "fullstack", label: "Fullstack" }
        ],
        blocking: true,
        priority: 1,
        reason: "Define camadas"
      }
    ]
  };
  const discoverer = new BatchIntentDiscoverer({ provider: makeFakeProvider(response) });
  const result = await discoverer.discover("crud", { requirements: [], constraints: [] }, [], {});
  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].id, "q1");
  assert.equal(result.questions[0].dimension, "scope");
});

test("BatchIntentDiscoverer: validates question set", async () => {
  const response = {
    questions: [
      { id: "q1", dimension: "scope", text: "Escopo?", answerType: "boolean", blocking: true },
      { id: "q1", dimension: "scope2", text: "Escopo2?", answerType: "boolean", blocking: true }
    ]
  };
  const discoverer = new BatchIntentDiscoverer({ provider: makeFakeProvider(response) });
  const result = await discoverer.discover("crud", { requirements: [], constraints: [] }, [], {});
  assert.equal(result.valid, false);
  assert.ok(result.validationErrors.some((e) => e.includes("q1")));
});

test("BatchIntentDiscoverer: returns empty questions on provider failure", async () => {
  const provider = {
    detect: () => true,
    execute: async () => ({
      pid: "fake",
      cancel: () => {},
      result: Promise.reject(new Error("provider crash"))
    })
  };
  const discoverer = new BatchIntentDiscoverer({ provider });
  const result = await discoverer.discover("crud", { requirements: [], constraints: [] }, [], {});
  assert.equal(result.questions.length, 0);
  assert.ok(result.error);
});

test("BatchIntentDiscoverer: returns empty when provider not detected", async () => {
  const provider = { detect: () => false };
  const discoverer = new BatchIntentDiscoverer({ provider });
  const result = await discoverer.discover("crud", { requirements: [], constraints: [] }, [], {});
  assert.equal(result.questions.length, 0);
});

test("BatchIntentDiscoverer: includes activation conditions", async () => {
  const response = {
    questions: [
      { id: "q1", dimension: "scope", text: "Escopo?", answerType: "single-choice",
        options: [{ value: "backend", label: "Backend" }, { value: "fullstack", label: "Fullstack" }],
        blocking: true },
      { id: "q2", dimension: "fw", text: "Framework?", answerType: "boolean",
        activation: { all: [{ questionId: "q1", operator: "in", values: ["fullstack"] }] },
        blocking: true }
    ]
  };
  const discoverer = new BatchIntentDiscoverer({ provider: makeFakeProvider(response) });
  const result = await discoverer.discover("crud", { requirements: [], constraints: [] }, [], {});
  assert.equal(result.questions.length, 2);
  assert.ok(result.questions[1].activation);
});

test("BatchIntentDiscoverer: questionCount and discoveryRound tracking", async () => {
  const response = {
    questions: [
      { id: "q1", dimension: "scope", text: "Escopo?", answerType: "boolean", blocking: true },
      { id: "q2", dimension: "data", text: "Dados?", answerType: "boolean", blocking: true }
    ]
  };
  const discoverer = new BatchIntentDiscoverer({ provider: makeFakeProvider(response) });
  const result = await discoverer.discover("crud", { requirements: [], constraints: [] }, [], {});
  assert.equal(result.questionCount, 2);
  assert.equal(result.discoveryRound, 1);
});

test("BatchIntentDiscoverer: increments discoveryRound", async () => {
  const response = {
    questions: [{ id: "q1", dimension: "scope", text: "Escopo?", answerType: "boolean", blocking: true }]
  };
  const discoverer = new BatchIntentDiscoverer({ provider: makeFakeProvider(response) });
  await discoverer.discover("crud", { requirements: [], constraints: [] }, [], {});
  const result2 = await discoverer.discover("crud", { requirements: [], constraints: [] }, [], {});
  assert.equal(result2.discoveryRound, 2);
});

test("BatchIntentDiscoverer: retry on parse failure", async () => {
  let callCount = 0;
  const provider = {
    detect: () => true,
    execute: async () => {
      callCount++;
      if (callCount === 1) {
        return { pid: "fake", cancel: () => {}, result: Promise.resolve({ stdout: "not json", stderr: "", exitCode: 0 }) };
      }
      return { pid: "fake", cancel: () => {}, result: Promise.resolve({
        stdout: JSON.stringify({ questions: [{ id: "q1", dimension: "scope", text: "x", answerType: "boolean", blocking: true }] }),
        stderr: "", exitCode: 0
      })};
    }
  };
  const discoverer = new BatchIntentDiscoverer({ provider });
  const result = await discoverer.discover("crud", { requirements: [], constraints: [] }, [], {});
  assert.equal(result.questions.length, 1);
  assert.equal(callCount, 2);
});

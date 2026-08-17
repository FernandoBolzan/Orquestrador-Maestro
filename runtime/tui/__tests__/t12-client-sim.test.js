"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createClientSim, createManualClock } = require("../testing/client-sim");

test("T12.2 entrega snapshot e deltas ordenados", async () => {
  const clock = createManualClock();
  const sim = createClientSim({ events: [
    { type: "snapshot", projectId: "p1", epoch: "e1", seq: 2, data: { missions: [] } },
    { type: "mission.updated", projectId: "p1", epoch: "e1", seq: 3, eventId: "ev3", data: { id: "m1" } }
  ], clock });
  const seen = [];
  sim.onSnapshot((value) => seen.push(["snapshot", value.seq]));
  sim.onEvent((value) => seen.push([value.type, value.seq]));
  await sim.connect(); await sim.waitIdle();
  assert.deepEqual(seen, [["snapshot", 2], ["mission.updated", 3]]);
});

test("T12.2 reconnect retoma por seq, preenche gap e descarta eventId duplicado", async () => {
  const sim = createClientSim({ events: [
    { type: "snapshot", projectId: "p1", epoch: "e1", seq: 1, data: {} },
    { type: "task.updated", projectId: "p1", epoch: "e1", seq: 2, eventId: "same", data: { n: 2 } },
    { type: "disconnect", projectId: "p1", epoch: "e1", seq: 3 },
    { type: "task.updated", projectId: "p1", epoch: "e1", seq: 4, eventId: "same", data: { n: 4 } },
    { type: "task.updated", projectId: "p1", epoch: "e1", seq: 5, eventId: "new", data: { n: 5 } }
  ], clock: createManualClock() });
  const seq = []; sim.onEvent((event) => seq.push(event.seq));
  await sim.connect(); await sim.reconnect(); await sim.waitIdle();
  assert.deepEqual(seq, [2, 5]);
  assert.equal(sim.state().lastSeq, 5);
});

test("T12.2 switch isola estado por projeto sem currentProject global", async () => {
  const sim = createClientSim({ events: [], clock: createManualClock() });
  await sim.emit("snapshot", { projectId: "a", epoch: "ea", seq: 1, data: { marker: "A" } });
  await sim.emit("snapshot", { projectId: "b", epoch: "eb", seq: 1, data: { marker: "B" } });
  assert.equal(sim.state("a").snapshot.marker, "A");
  assert.equal(sim.state("b").snapshot.marker, "B");
  assert.equal(Object.hasOwn(sim.state(), "currentProject"), false);
});

test("T12.2 atenção resolve e refresh de skills substitui catálogo com recs limpas", async () => {
  const sim = createClientSim({ events: [], clock: createManualClock(), recommend: (skills) => skills.map((s) => s.id) });
  await sim.emit("attention.created", { projectId: "p", epoch: "e", seq: 1, eventId: "a", data: { id: "att" } });
  await sim.emit("attention.resolved", { projectId: "p", epoch: "e", seq: 2, eventId: "b", data: { id: "att" } });
  await sim.emit("skills.refresh", { projectId: "p", epoch: "e", seq: 3, eventId: "c", data: { skills: [{ id: "new" }] } });
  assert.deepEqual(sim.state("p").attention, []);
  assert.deepEqual(sim.state("p").skills, [{ id: "new" }]);
  assert.deepEqual(sim.state("p").recommendations, ["new"]);
});

test("T12.2 relógio manual não usa timeout real", async () => {
  const clock = createManualClock(); let ran = false;
  clock.setTimeout(() => { ran = true; }, 5000);
  assert.equal(ran, false); clock.advance(5000); assert.equal(ran, true);
});

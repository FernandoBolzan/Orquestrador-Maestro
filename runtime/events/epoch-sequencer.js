"use strict";

const { FAMILIES_TYPES, familyOf } = require("./event-families");
const { toRuntimeEvent } = require("./runtime-event");

const STREAM_CAP = 1000;
function nextEpoch(last = 0) { return Math.max(0, Number.isInteger(last) ? last : 0) + 1; }
function nextSeq(epoch, lastSeq = 0) {
  if (!Number.isInteger(epoch) || epoch < 1) throw new TypeError("epoch must be a positive integer");
  return Math.max(0, Number.isInteger(lastSeq) ? lastSeq : 0) + 1;
}

async function contextResolver(store, runId) {
  const run = await store.getRun(runId);
  if (!run?.taskId) return undefined;
  const task = await store.getTask(run.taskId);
  if (!task) return undefined;
  return { projectId: task.projectId, missionId: task.missionId || task.metadata?.missionId, taskId: task.id };
}

async function materialize({ store, epoch }) {
  const legacyEvents = await store.listEvents();
  const sequences = new Map();
  const events = [];
  for (const legacy of legacyEvents) {
    const family = familyOf(legacy.type);
    const seq = (sequences.get(family) || 0) + 1;
    sequences.set(family, seq);
    events.push(await toRuntimeEvent(legacy, { epoch, seq, resolveContext: (runId) => contextResolver(store, runId) }));
  }
  return events;
}

async function buildSnapshot({ store, epoch, streams, cap = STREAM_CAP }) {
  const requested = streams ? new Set(streams) : null;
  const grouped = Object.fromEntries(Object.keys(FAMILIES_TYPES).filter((f) => !requested || requested.has(f)).map((f) => [f, []]));
  for (const event of await materialize({ store, epoch })) {
    const family = familyOf(event.type);
    if (grouped[family]) grouped[family].push(event);
  }
  const truncated = {};
  for (const [family, events] of Object.entries(grouped)) {
    if (events.length > cap) { truncated[family] = events.length - cap; grouped[family] = events.slice(-cap); }
  }
  return Object.freeze({ epoch, streams: grouped, truncated: Object.freeze(truncated) });
}

async function eventsSince({ store, cursor, epoch = cursor?.epoch }) {
  const normalized = cursor || { epoch, perStream: {} };
  const events = (await materialize({ store, epoch })).filter((event) => event.seq > (normalized.perStream?.[familyOf(event.type)] || 0));
  const perStream = { ...(normalized.perStream || {}) };
  for (const event of events) perStream[familyOf(event.type)] = Math.max(perStream[familyOf(event.type)] || 0, event.seq);
  return { events, nextCursor: { epoch, perStream } };
}

function applySnapshot(clientState = {}, snapshot) {
  const streams = clientState.epoch === undefined || clientState.epoch === snapshot.epoch ? { ...(clientState.streams || {}) } : {};
  for (const [family, incoming] of Object.entries(snapshot.streams || {})) {
    const bySeq = new Map((streams[family] || []).map((event) => [event.seq, event]));
    for (const event of incoming) bySeq.set(event.seq, event);
    streams[family] = [...bySeq.values()].sort((a, b) => a.seq - b.seq);
  }
  return { ...clientState, epoch: snapshot.epoch, streams };
}

module.exports = { STREAM_CAP, applySnapshot, buildSnapshot, eventsSince, nextEpoch, nextSeq };

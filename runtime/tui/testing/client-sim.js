"use strict";

function createManualClock() {
  let now = 0; let nextId = 1;
  const pending = new Map();
  return {
    now: () => now,
    setTimeout(fn, delay = 0) { const id = nextId++; pending.set(id, { at: now + delay, fn }); return id; },
    clearTimeout(id) { pending.delete(id); },
    advance(ms) {
      now += ms;
      for (const [id, item] of [...pending.entries()].sort((a, b) => a[1].at - b[1].at)) {
        if (item.at <= now) { pending.delete(id); item.fn(); }
      }
    },
    runAll() { while (pending.size) this.advance(Math.min(...[...pending.values()].map((item) => item.at)) - now); }
  };
}

function createClientSim({ events = [], clock = createManualClock(), recommend = () => [] } = {}) {
  const snapshots = new Set(); const deltas = new Set(); const projects = new Map(); const seen = new Set();
  let cursor = 0; let disconnected = false; let chain = Promise.resolve(); let lastProjectId = null;

  function project(id) {
    if (!projects.has(id)) projects.set(id, { projectId: id, epoch: null, lastSeq: 0, snapshot: {}, attention: [], skills: [], recommendations: [] });
    return projects.get(id);
  }

  async function deliver(event) {
    if (!event || !event.projectId) throw new Error("client-sim event requires projectId");
    lastProjectId = event.projectId;
    const state = project(event.projectId);
    if (event.type === "snapshot") {
      state.epoch = event.epoch; state.lastSeq = event.seq; state.snapshot = { ...(event.data || {}) };
      for (const cb of snapshots) cb(event);
      return;
    }
    if (event.eventId && seen.has(event.eventId)) return;
    if (event.eventId) seen.add(event.eventId);
    if (state.epoch && event.epoch !== state.epoch) return;
    if (event.seq <= state.lastSeq) return;
    state.epoch = event.epoch; state.lastSeq = event.seq;
    if (event.type === "attention.created") state.attention = [...state.attention.filter((a) => a.id !== event.data.id), event.data];
    if (event.type === "attention.resolved") state.attention = state.attention.filter((a) => a.id !== event.data.id);
    if (event.type === "skills.refresh") {
      state.skills = [...(event.data.skills || [])];
      state.recommendations = recommend(state.skills, event.projectId, { clean: true });
    }
    for (const cb of deltas) cb(event);
  }

  function enqueue(event) { chain = chain.then(() => deliver(event)); return chain; }
  async function drain() {
    while (cursor < events.length) {
      const event = events[cursor++];
      if (event.type === "disconnect") { disconnected = true; break; }
      await enqueue(event);
    }
  }

  return {
    async connect() { disconnected = false; await drain(); },
    async reconnect() { if (!disconnected) return; disconnected = false; await drain(); },
    onSnapshot(cb) { snapshots.add(cb); return () => snapshots.delete(cb); },
    onEvent(cb) { deltas.add(cb); return () => deltas.delete(cb); },
    emit(type, payload) { return enqueue({ ...payload, type }); },
    async waitIdle() { clock.runAll(); await chain; },
    state(projectId) {
      if (projectId) return project(projectId);
      return lastProjectId ? project(lastProjectId) : { projects: Object.fromEntries(projects) };
    }
  };
}

module.exports = { createClientSim, createManualClock };

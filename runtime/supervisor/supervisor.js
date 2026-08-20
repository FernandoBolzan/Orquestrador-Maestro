"use strict";

const EventEmitter = require("node:events");

class MaestroSupervisor extends EventEmitter {
  constructor({ projectRuntimes = new Map(), maxGlobalConcurrentRuns = 10 } = {}) {
    super();
    this.projectRuntimes = new Map(projectRuntimes);
    this.maxGlobalConcurrentRuns = maxGlobalConcurrentRuns;
    this.unsubscribers = new Map();
  }

  registerProjectRuntime(projectId, runtimeClient) {
    if (!projectId || !runtimeClient) throw new TypeError("projectId and runtimeClient are required");
    this.projectRuntimes.set(projectId, runtimeClient);

    if (typeof runtimeClient.subscribe === "function") {
      const unsub = runtimeClient.subscribe((event) => {
        this.emit("event", { projectId, ...event });
      });
      this.unsubscribers.set(projectId, unsub);
    }
    this.emit("project.registered", { projectId });
    return this;
  }

  unregisterProjectRuntime(projectId) {
    const unsub = this.unsubscribers.get(projectId);
    if (unsub) {
      unsub();
      this.unsubscribers.delete(projectId);
    }
    const removed = this.projectRuntimes.delete(projectId);
    if (removed) this.emit("project.unregistered", { projectId });
    return removed;
  }

  getRuntime(projectId) {
    return this.projectRuntimes.get(projectId) || null;
  }

  async listProjects() {
    const results = [];
    for (const [projectId, runtime] of this.projectRuntimes.entries()) {
      try {
        const info = await runtime.inspectProject({ projectId });
        results.push(info);
      } catch (error) {
        results.push({ id: projectId, status: "unreachable", error: error.message });
      }
    }
    return results;
  }

  async aggregateAttention() {
    const allAttention = [];
    for (const [projectId, runtime] of this.projectRuntimes.entries()) {
      try {
        const items = await runtime.listAttention({ projectId });
        for (const item of items || []) {
          allAttention.push({ projectId, ...item });
        }
      } catch {}
    }
    // Sort critical > high > medium > low
    const severityPrio = { critical: 0, high: 1, medium: 2, low: 3 };
    allAttention.sort((a, b) => (severityPrio[a.severity] ?? 4) - (severityPrio[b.severity] ?? 4));
    return allAttention;
  }

  async aggregateHealth() {
    const projectsHealth = {};
    let totalRuns = 0;
    for (const [projectId, runtime] of this.projectRuntimes.entries()) {
      try {
        const health = typeof runtime.health === "function" ? await runtime.health() : { status: "ok" };
        projectsHealth[projectId] = health;
        const runs = typeof runtime.listRuns === "function" ? await runtime.listRuns({ status: "running" }) : [];
        totalRuns += runs.length;
      } catch (error) {
        projectsHealth[projectId] = { status: "error", error: error.message };
      }
    }

    const hasErrors = Object.values(projectsHealth).some((h) => h.status === "error" || h.phase === "offline");
    return {
      status: hasErrors ? "degraded" : "healthy",
      projectsCount: this.projectRuntimes.size,
      activeRuns: totalRuns,
      maxGlobalConcurrentRuns: this.maxGlobalConcurrentRuns,
      capacityAvailable: Math.max(0, this.maxGlobalConcurrentRuns - totalRuns),
      projects: projectsHealth
    };
  }

  async resolveAttention(projectId, attentionId, decision, options = {}) {
    const runtime = this.getRuntime(projectId);
    if (!runtime) {
      const error = new Error(`No runtime registered for project ${projectId}`);
      error.code = "PROJECT_NOT_FOUND";
      throw error;
    }
    return runtime.resolveAttention(attentionId, decision, options);
  }

  close() {
    for (const unsub of this.unsubscribers.values()) unsub();
    this.unsubscribers.clear();
    this.projectRuntimes.clear();
  }
}

module.exports = { MaestroSupervisor };

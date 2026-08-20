"use strict";

const EventEmitter = require("node:events");
const { RunLeaseManager } = require("../runs/run-lease");

class MaestroScheduler extends EventEmitter {
  constructor({ application, leaseManager, maxParallel = 3 } = {}) {
    super();
    this.app = application;
    this.leaseManager = leaseManager || new RunLeaseManager();
    this.maxParallel = maxParallel;
  }

  computeReadiness(tasks = [], { completedTaskIds = new Set(), failedTaskIds = new Set(), runningTaskIds = new Set() } = {}) {
    const eligibleTasks = [];
    const blockedTasks = [];

    for (const task of tasks) {
      if (completedTaskIds.has(task.id) || failedTaskIds.has(task.id) || runningTaskIds.has(task.id)) {
        continue;
      }

      const deps = task.dependsOn || [];
      const failedDeps = deps.filter((dep) => failedTaskIds.has(dep));
      if (failedDeps.length > 0) {
        blockedTasks.push({ task, reason: `Blocked by failed dependencies: ${failedDeps.join(", ")}`, failedDeps });
        continue;
      }

      const allDepsCompleted = deps.every((dep) => completedTaskIds.has(dep));
      if (allDepsCompleted) {
        eligibleTasks.push(task);
      }
    }

    return {
      eligibleTasks,
      blockedTasks
    };
  }

  async executePlan(tasks, missionId, { sessionId = `scheduler-${process.pid}` } = {}) {
    const results = {};
    const pending = [...tasks];
    const running = new Set();
    const completed = new Set();
    const failed = new Set();

    let projectId = missionId;
    try {
      const mission = await this.app?.getMission?.(missionId);
      if (mission?.projectId) projectId = mission.projectId;
    } catch {}

    const markFailed = (task, errorMessage) => {
      results[task.id] = { status: "failed", error: errorMessage };
      failed.add(task.id);
      this.emit("task.failed", { ...task, error: errorMessage });
    };

    return new Promise((resolve) => {
      const checkNext = () => {
        if (pending.length === 0 && running.size === 0) return resolve(results);

        // Transitively fail blocked tasks whose dependencies failed
        let changed = true;
        while (changed && pending.length > 0) {
          changed = false;
          for (let i = 0; i < pending.length; i++) {
            const task = pending[i];
            const deps = task.dependsOn || [];
            const blockingFailures = deps.filter((dep) => failed.has(dep));
            if (blockingFailures.length === 0) continue;
            pending.splice(i, 1);
            markFailed(task, `blocked by failed dependency: ${blockingFailures.join(", ")}`);
            changed = true;
            i--;
          }
        }

        while (running.size < this.maxParallel) {
          const nextIndex = pending.findIndex((t) =>
            (t.dependsOn || []).every((dep) => completed.has(dep))
          );

          if (nextIndex === -1) break;

          const task = pending.splice(nextIndex, 1)[0];
          running.add(task.id);

          this.emit("task.started", task);

          // Acquire lease before execution
          const runId = task.runId || `run-${task.id}`;
          let lease;
          try {
            lease = this.leaseManager.acquire(runId, sessionId);
          } catch (error) {
            markFailed(task, `Failed to acquire execution lease: ${error.message}`);
            running.delete(task.id);
            continue;
          }

          this.app.executeRun({
            description: task.description,
            providerId: task.provider,
            model: task.model,
            skills: task.skills,
            projectId,
            missionId,
            semanticTaskId: task.id,
            runId
          })
            .then((result) => {
              // Verify fencing before settling
              this.leaseManager.verifyFencing(runId, sessionId, lease.generation);
              this.leaseManager.release(runId, sessionId, lease.generation);
              results[task.id] = { status: "completed", result };
              completed.add(task.id);
              this.emit("task.completed", task);
            })
            .catch((error) => {
              this.leaseManager.release(runId, sessionId, lease.generation);
              markFailed(task, error.message);
            })
            .finally(() => {
              running.delete(task.id);
              checkNext();
            });
        }

        if (running.size === 0) {
          for (const task of pending.splice(0)) {
            markFailed(task, "no runnable task (missing or cyclic dependencies)");
          }
          if (Object.keys(results).length === tasks.length) {
            resolve(results);
          }
        }
      };

      checkNext();
    });
  }
}

module.exports = { MaestroScheduler };

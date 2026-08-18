"use strict";

const EventEmitter = require("node:events");

/**
 * Executa tarefas paralelamente respeitando restrições de dependências
 * e limites de concorrência.
 *
 * Se uma dependência falha, as tarefas que dependem dela são marcadas como
 * failed (BLOCKED) em vez de ficarem pendentes para sempre; o executor
 * conclui quando não há mais tarefas pendentes nem em execução.
 */
class LaneExecutor extends EventEmitter {
  constructor({ application, maxParallel = 3 }) {
    super();
    this.app = application;
    this.maxParallel = maxParallel;
  }

  async execute(tasks, missionId) {
    const results = {};
    const pending = [...tasks];
    const running = new Set();
    const completed = new Set();
    const failed = new Set();

    let projectId = missionId;
    try {
      const mission = await this.app.getMission(missionId);
      if (mission && typeof mission.projectId === "string" && mission.projectId.trim() !== "") {
        projectId = mission.projectId;
      }
    } catch {
      // Mission lookup is best-effort; fall back to the mission id.
    }

    const markFailed = (task, errorMessage) => {
      results[task.id] = { status: "failed", error: errorMessage };
      failed.add(task.id);
      this.emit("task.failed", { ...task, error: errorMessage });
    };

    return new Promise((resolve) => {
      const checkNext = () => {
        if (pending.length === 0 && running.size === 0) return resolve(results);

        // Fixpoint sweep: a failed dependency must block its dependents
        // transitively (B depends on A depends on X, X fails -> A and B fail).
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

          if (nextIndex === -1) break; // No tasks ready

          const task = pending.splice(nextIndex, 1)[0];
          running.add(task.id);

          this.emit("task.started", task);

          this.app.executeRun({
            description: task.description,
            providerId: task.provider,
            model: task.model,
            skills: task.skills,
            projectId,
            missionId,
            semanticTaskId: task.id
          })
            .then((result) => {
              results[task.id] = { status: "completed", result };
              completed.add(task.id);
              this.emit("task.completed", task);
            })
            .catch((error) => {
              markFailed(task, error.message);
            })
            .finally(() => {
              running.delete(task.id);
              checkNext();
            });
        }

        // Closing state: if nothing is running and nothing is pending the
        // run is settled. If pending remains (missing or cyclic deps),
        // fail the remainder and settle — never hold the promise open.
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

module.exports = { LaneExecutor };

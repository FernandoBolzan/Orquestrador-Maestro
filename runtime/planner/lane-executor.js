"use strict";

const EventEmitter = require("node:events");

/**
 * Executa tarefas paralelamente respeitando restrições de dependências
 * e limites de concorrência.
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

    return new Promise((resolve) => {
      const checkNext = async () => {
        if (completed.size + failed.size === tasks.length) {
          return resolve(results);
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
            projectId: missionId
          })
            .then((result) => {
              results[task.id] = { status: "completed", result };
              completed.add(task.id);
              this.emit("task.completed", task);
            })
            .catch((error) => {
              results[task.id] = { status: "failed", error: error.message };
              failed.add(task.id);
              this.emit("task.failed", { ...task, error: error.message });
            })
            .finally(() => {
              running.delete(task.id);
              checkNext();
            });
        }
      };

      checkNext();
    });
  }
}

module.exports = { LaneExecutor };

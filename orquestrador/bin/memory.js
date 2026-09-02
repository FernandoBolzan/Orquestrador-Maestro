#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");

const MEMORY_SCHEMA = require("../../MEMORY_SCHEMA.json");

const OBSERVATION_TYPES = MEMORY_SCHEMA.properties.type.enum;

class Memory {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(os.homedir(), ".orquestrador", "memory");
    this.schemaVersion = 1;
  }

  generateId() {
    return `obs_${crypto.randomBytes(8).toString("hex")}`;
  }

  getProjectDir(projectId) {
    const safeId = projectId.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 64);
    return path.join(this.baseDir, "projects", safeId);
  }

  getObservationsFile(projectId) {
    return path.join(this.getProjectDir(projectId), "observations.jsonl");
  }

  ensureProjectDir(projectId) {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  redactContent(content) {
    if (typeof content !== "string") return content;
    
    return content
      .replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|authorization)\s*[:=]\s*[^\s`"']+/giu, "$1=[REDACTED]")
      .replace(/(?:[A-Za-z]:[\\/]|\/Users\/|\/home\/|\/root\/)[^\s`"']+/gu, "[PATH_REDACTED]")
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL_REDACTED]")
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE_REDACTED]")
      .replace(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, "[SSN_REDACTED]");
  }

  validateObservation(obs) {
    if (!obs.schemaVersion || obs.schemaVersion !== 1) {
      throw new Error("Invalid schemaVersion");
    }
    if (!obs.id || !/^obs_[a-f0-9]{16}$/.test(obs.id)) {
      throw new Error("Invalid observation ID");
    }
    if (!OBSERVATION_TYPES.includes(obs.type)) {
      throw new Error(`Invalid observation type: ${obs.type}`);
    }
    if (!obs.summary || obs.summary.length === 0) {
      throw new Error("Summary is required");
    }
    if (!obs.project) {
      throw new Error("Project is required");
    }
    return true;
  }

  record(projectId, observation) {
    this.ensureProjectDir(projectId);
    
    const obs = {
      schemaVersion: this.schemaVersion,
      id: observation.id || this.generateId(),
      timestamp: observation.timestamp || new Date().toISOString(),
      project: projectId,
      taskId: observation.taskId || null,
      type: observation.type,
      summary: this.redactContent(observation.summary),
      details: observation.details ? this.redactContent(observation.details) : null,
      files: observation.files || [],
      tags: observation.tags || [],
      verified: observation.verified || false,
      source: observation.source || {}
    };

    this.validateObservation(obs);

    const filePath = this.getObservationsFile(projectId);
    const line = JSON.stringify(obs) + "\n";
    fs.appendFileSync(filePath, line, "utf8");

    return obs;
  }

  search(projectId, query = {}) {
    const filePath = this.getObservationsFile(projectId);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
    let observations = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (query.type) {
      observations = observations.filter(obs => obs.type === query.type);
    }

    if (query.verified !== undefined) {
      observations = observations.filter(obs => obs.verified === query.verified);
    }

    if (query.tags && query.tags.length > 0) {
      observations = observations.filter(obs => 
        query.tags.some(tag => obs.tags.includes(tag))
      );
    }

    if (query.files && query.files.length > 0) {
      observations = observations.filter(obs =>
        query.files.some(file => obs.files.includes(file))
      );
    }

    if (query.from) {
      const fromDate = new Date(query.from);
      observations = observations.filter(obs => new Date(obs.timestamp) >= fromDate);
    }

    if (query.to) {
      const toDate = new Date(query.to);
      observations = observations.filter(obs => new Date(obs.timestamp) <= toDate);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      observations = observations.filter(obs =>
        obs.summary.toLowerCase().includes(searchLower) ||
        (obs.details && obs.details.toLowerCase().includes(searchLower)) ||
        obs.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    observations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (query.limit) {
      observations = observations.slice(0, query.limit);
    }

    return observations;
  }

  show(projectId, observationId) {
    const filePath = this.getObservationsFile(projectId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const obs = JSON.parse(line);
        if (obs.id === observationId) {
          return obs;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  timeline(projectId, options = {}) {
    const observations = this.search(projectId, {
      from: options.from,
      to: options.to,
      limit: options.limit || 50
    });

    const timeline = [];
    for (const obs of observations) {
      timeline.push({
        id: obs.id,
        timestamp: obs.timestamp,
        type: obs.type,
        summary: obs.summary,
        verified: obs.verified
      });
    }

    return timeline;
  }

  promote(projectId, observationId, destination) {
    const obs = this.show(projectId, observationId);
    if (!obs) {
      throw new Error(`Observation not found: ${observationId}`);
    }

    if (!obs.verified) {
      throw new Error("Cannot promote unverified observation");
    }

    return {
      observation: obs,
      destination,
      promotedAt: new Date().toISOString(),
      status: "promoted"
    };
  }

  stats(projectId) {
    const filePath = this.getObservationsFile(projectId);
    if (!fs.existsSync(filePath)) {
      return { total: 0, byType: {}, verified: 0 };
    }

    const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
    const observations = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const byType = {};
    let verified = 0;

    for (const obs of observations) {
      byType[obs.type] = (byType[obs.type] || 0) + 1;
      if (obs.verified) verified++;
    }

    return {
      total: observations.length,
      byType,
      verified,
      unverified: observations.length - verified
    };
  }

  listProjects() {
    const projectsDir = path.join(this.baseDir, "projects");
    if (!fs.existsSync(projectsDir)) {
      return [];
    }

    return fs.readdirSync(projectsDir).filter(dir => {
      const dirPath = path.join(projectsDir, dir);
      return fs.statSync(dirPath).isDirectory();
    });
  }

  prune(projectId, options = {}) {
    const filePath = this.getObservationsFile(projectId);
    if (!fs.existsSync(filePath)) {
      return { pruned: 0 };
    }

    const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
    let observations = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const initialCount = observations.length;

    if (options.keepRecent) {
      observations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      observations = observations.slice(0, options.keepRecent);
    }

    if (options.keepVerified !== false) {
      const verified = observations.filter(obs => obs.verified);
      const unverified = observations.filter(obs => !obs.verified);
      
      if (options.keepRecent) {
        const keepCount = Math.min(options.keepRecent, verified.length);
        observations = [...verified.slice(0, keepCount), ...unverified];
      }
    }

    const newContent = observations.map(obs => JSON.stringify(obs)).join("\n") + "\n";
    fs.writeFileSync(filePath, newContent, "utf8");

    return { pruned: initialCount - observations.length, remaining: observations.length };
  }

  dedupe(projectId) {
    const filePath = this.getObservationsFile(projectId);
    if (!fs.existsSync(filePath)) {
      return { deduped: 0, remaining: 0 };
    }

    const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
    const observations = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const initialCount = observations.length;
    const seen = new Map();
    const deduped = [];

    for (const obs of observations) {
      const key = `${obs.type}:${obs.summary}:${obs.project}`;
      const existing = seen.get(key);
      
      if (!existing) {
        seen.set(key, obs);
        deduped.push(obs);
      } else {
        if (new Date(obs.timestamp) > new Date(existing.timestamp)) {
          const index = deduped.findIndex(d => d.id === existing.id);
          if (index !== -1) {
            deduped[index] = obs;
          }
          seen.set(key, obs);
        }
      }
    }

    const newContent = deduped.map(obs => JSON.stringify(obs)).join("\n") + "\n";
    fs.writeFileSync(filePath, newContent, "utf8");

    return { deduped: initialCount - deduped.length, remaining: deduped.length };
  }

  consolidate(projectId, observationIds, consolidatedObs) {
    const observations = observationIds.map(id => this.show(projectId, id)).filter(Boolean);
    
    if (observations.length === 0) {
      throw new Error("No valid observations found to consolidate");
    }

    const consolidated = {
      schemaVersion: this.schemaVersion,
      id: consolidatedObs.id || this.generateId(),
      timestamp: consolidatedObs.timestamp || new Date().toISOString(),
      project: projectId,
      taskId: consolidatedObs.taskId || observations[0].taskId,
      type: consolidatedObs.type || "discovery",
      summary: this.redactContent(consolidatedObs.summary),
      details: consolidatedObs.details ? this.redactContent(consolidatedObs.details) : null,
      files: [...new Set(observations.flatMap(obs => obs.files || []))],
      tags: [...new Set(observations.flatMap(obs => obs.tags || []))],
      verified: consolidatedObs.verified || false,
      source: consolidatedObs.source || {},
      consolidatedFrom: observationIds
    };

    this.validateObservation(consolidated);

    const filePath = this.getObservationsFile(projectId);
    const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
    const allObservations = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const filtered = allObservations.filter(obs => !observationIds.includes(obs.id));
    filtered.push(consolidated);

    const newContent = filtered.map(obs => JSON.stringify(obs)).join("\n") + "\n";
    fs.writeFileSync(filePath, newContent, "utf8");

    return consolidated;
  }

  retention(projectId, options = {}) {
    const filePath = this.getObservationsFile(projectId);
    if (!fs.existsSync(filePath)) {
      return { retained: 0, removed: 0 };
    }

    const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
    const observations = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const initialCount = observations.length;
    const now = new Date();
    const maxAgeDays = options.maxAgeDays || 90;
    const maxCount = options.maxCount || 1000;

    let filtered = observations.filter(obs => {
      const age = (now - new Date(obs.timestamp)) / (1000 * 60 * 60 * 24);
      return age <= maxAgeDays;
    });

    if (filtered.length > maxCount) {
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      filtered = filtered.slice(0, maxCount);
    }

    if (options.keepVerified !== false) {
      const verified = observations.filter(obs => obs.verified);
      const unverified = filtered.filter(obs => !obs.verified);
      const keepVerified = verified.filter(obs => {
        const age = (now - new Date(obs.timestamp)) / (1000 * 60 * 60 * 24);
        return age <= maxAgeDays;
      });
      filtered = [...keepVerified, ...unverified];
    }

    const newContent = filtered.map(obs => JSON.stringify(obs)).join("\n") + "\n";
    fs.writeFileSync(filePath, newContent, "utf8");

    return { retained: filtered.length, removed: initialCount - filtered.length };
  }

  cleanup(projectId) {
    const dedupeResult = this.dedupe(projectId);
    const retentionResult = this.retention(projectId);
    
    return {
      deduped: dedupeResult.deduped,
      retained: retentionResult.retained,
      removed: retentionResult.removed
    };
  }
}

function printHelp() {
  console.log(`Orquestrador Maestro Memory

Uso:
  memory record --project <id> --type <type> --summary <text> [opções]
  memory search --project <id> [opções]
  memory show --project <id> --id <obs_id>
  memory timeline --project <id> [opções]
  memory promote --project <id> --id <obs_id> --destination <path>
  memory stats --project <id>
  memory projects
  memory prune --project <id> [opções]
  memory dedupe --project <id>
  memory consolidate --project <id> --ids <id1,id2,...> --type <type> --summary <text>
  memory retention --project <id> [opções]
  memory cleanup --project <id>

Tipos de observation:
  ${OBSERVATION_TYPES.join(", ")}

Opções:
  --project <id>        ID do projeto
  --type <type>         Tipo da observation
  --summary <text>      Resumo da observation
  --details <text>      Detalhes da observation
  --files <list>        Arquivos relacionados (comma-separated)
  --tags <list>         Tags (comma-separated)
  --verified            Marcar como verificado
  --task <id>           ID da tarefa
  --search <text>       Texto para buscar
  --from <date>         Data inicial (ISO)
  --to <date>           Data final (ISO)
  --limit <n>           Limite de resultados
  --id <obs_id>         ID da observation
  --destination <path>  Destino para promoção
  --keep-recent <n>     Manter N observations mais recentes
  --help                Mostra esta ajuda
`);
}

function parseArgs(argv) {
  const options = { command: null, project: null, type: null, summary: null, details: null, files: [], tags: [], verified: false, task: null, search: null, from: null, to: null, limit: null, id: null, ids: null, destination: null, keepRecent: null, maxAgeDays: null, maxCount: null };
  const args = argv.slice(2);
  
  if (args[0] === "--help" || args[0] === "-h" || args.length === 0) {
    options.help = true;
    return options;
  }

  options.command = args[0];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--project" && next) {
      options.project = next;
      i++;
    } else if (arg === "--type" && next) {
      options.type = next;
      i++;
    } else if (arg === "--summary" && next) {
      options.summary = next;
      i++;
    } else if (arg === "--details" && next) {
      options.details = next;
      i++;
    } else if (arg === "--files" && next) {
      options.files = next.split(",");
      i++;
    } else if (arg === "--tags" && next) {
      options.tags = next.split(",");
      i++;
    } else if (arg === "--verified") {
      options.verified = true;
    } else if (arg === "--task" && next) {
      options.task = next;
      i++;
    } else if (arg === "--search" && next) {
      options.search = next;
      i++;
    } else if (arg === "--from" && next) {
      options.from = next;
      i++;
    } else if (arg === "--to" && next) {
      options.to = next;
      i++;
    } else if (arg === "--limit" && next) {
      options.limit = parseInt(next, 10);
      i++;
    } else if (arg === "--id" && next) {
      options.id = next;
      i++;
    } else if (arg === "--ids" && next) {
      options.ids = next.split(",");
      i++;
    } else if (arg === "--destination" && next) {
      options.destination = next;
      i++;
    } else if (arg === "--keep-recent" && next) {
      options.keepRecent = parseInt(next, 10);
      i++;
    } else if (arg === "--max-age-days" && next) {
      options.maxAgeDays = parseInt(next, 10);
      i++;
    } else if (arg === "--max-count" && next) {
      options.maxCount = parseInt(next, 10);
      i++;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv);
  const memory = new Memory();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  try {
    switch (options.command) {
      case "record": {
        if (!options.project || !options.type || !options.summary) {
          console.error("Error: --project, --type, and --summary are required");
          process.exit(1);
        }
        const obs = memory.record(options.project, {
          type: options.type,
          summary: options.summary,
          details: options.details,
          files: options.files,
          tags: options.tags,
          verified: options.verified,
          taskId: options.task
        });
        console.log(JSON.stringify(obs, null, 2));
        break;
      }

      case "search": {
        if (!options.project) {
          console.error("Error: --project is required");
          process.exit(1);
        }
        const results = memory.search(options.project, {
          type: options.type,
          tags: options.tags,
          files: options.files,
          search: options.search,
          from: options.from,
          to: options.to,
          limit: options.limit,
          verified: options.verified
        });
        console.log(JSON.stringify(results, null, 2));
        break;
      }

      case "show": {
        if (!options.project || !options.id) {
          console.error("Error: --project and --id are required");
          process.exit(1);
        }
        const obs = memory.show(options.project, options.id);
        if (obs) {
          console.log(JSON.stringify(obs, null, 2));
        } else {
          console.error("Observation not found");
          process.exit(1);
        }
        break;
      }

      case "timeline": {
        if (!options.project) {
          console.error("Error: --project is required");
          process.exit(1);
        }
        const timeline = memory.timeline(options.project, {
          from: options.from,
          to: options.to,
          limit: options.limit
        });
        console.log(JSON.stringify(timeline, null, 2));
        break;
      }

      case "promote": {
        if (!options.project || !options.id || !options.destination) {
          console.error("Error: --project, --id, and --destination are required");
          process.exit(1);
        }
        const result = memory.promote(options.project, options.id, options.destination);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "stats": {
        if (!options.project) {
          console.error("Error: --project is required");
          process.exit(1);
        }
        const stats = memory.stats(options.project);
        console.log(JSON.stringify(stats, null, 2));
        break;
      }

      case "projects": {
        const projects = memory.listProjects();
        console.log(JSON.stringify(projects, null, 2));
        break;
      }

      case "prune": {
        if (!options.project) {
          console.error("Error: --project is required");
          process.exit(1);
        }
        const result = memory.prune(options.project, {
          keepRecent: options.keepRecent
        });
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "dedupe": {
        if (!options.project) {
          console.error("Error: --project is required");
          process.exit(1);
        }
        const result = memory.dedupe(options.project);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "consolidate": {
        if (!options.project || !options.ids || !options.type || !options.summary) {
          console.error("Error: --project, --ids, --type, and --summary are required");
          process.exit(1);
        }
        const result = memory.consolidate(options.project, options.ids, {
          type: options.type,
          summary: options.summary,
          details: options.details,
          verified: options.verified
        });
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "retention": {
        if (!options.project) {
          console.error("Error: --project is required");
          process.exit(1);
        }
        const result = memory.retention(options.project, {
          maxAgeDays: options.maxAgeDays,
          maxCount: options.maxCount,
          keepVerified: !options.noKeepVerified
        });
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "cleanup": {
        if (!options.project) {
          console.error("Error: --project is required");
          process.exit(1);
        }
        const result = memory.cleanup(options.project);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      default:
        console.error(`Unknown command: ${options.command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { Memory };
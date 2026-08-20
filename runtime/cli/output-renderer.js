"use strict";

function toToon(value, indent = 0) {
  const pad = "  ".repeat(indent);
  if (value === null || value === undefined) return `${pad}~`;
  if (typeof value === "boolean") return `${pad}${value ? "T" : "F"}`;
  if (typeof value === "number") return `${pad}${value}`;
  if (typeof value === "string") return `${pad}${value.includes("\n") || value.includes(" ") ? JSON.stringify(value) : value}`;

  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    if (value.every((v) => typeof v !== "object" || v === null)) {
      return `${pad}[${value.map((v) => typeof v === "string" && !v.includes(" ") ? v : JSON.stringify(v)).join(" ")}]`;
    }
    return value.map((item) => `${pad}- ${toToon(item, 0)}`).join("\n");
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return `${pad}{}`;
    return keys.map((key) => {
      const val = value[key];
      if (val !== null && typeof val === "object") {
        return `${pad}${key}:\n${toToon(val, indent + 1)}`;
      }
      return `${pad}${key}: ${toToon(val, 0)}`;
    }).join("\n");
  }

  return `${pad}${String(value)}`;
}

function renderHuman(data) {
  if (data === null || data === undefined) return "—";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) {
    if (data.length === 0) return "Nenhum registro encontrado.";
    return data.map((item, idx) => {
      if (typeof item === "object" && item !== null) {
        const title = item.name || item.title || item.id || item.description || `Item ${idx + 1}`;
        const details = Object.entries(item)
          .filter(([k]) => !["name", "title", "id", "description"].includes(k))
          .map(([k, v]) => `  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
          .join("\n");
        return `• ${title}${details ? `\n${details}` : ""}`;
      }
      return `• ${item}`;
    }).join("\n");
  }
  if (typeof data === "object") {
    return Object.entries(data).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v, null, 2) : v}`).join("\n");
  }
  return String(data);
}

class OutputRenderer {
  static render(data, format = "human") {
    const normFormat = String(format || "human").toLowerCase().trim();
    switch (normFormat) {
      case "json":
        return JSON.stringify(data, null, 2);
      case "jsonl":
        if (Array.isArray(data)) {
          return data.map((item) => JSON.stringify(item)).join("\n");
        }
        return JSON.stringify(data);
      case "toon":
        return toToon(data);
      case "human":
      default:
        return renderHuman(data);
    }
  }

  static output(result, { format = "human", stream = process.stdout } = {}) {
    const rawData = result && result.data !== undefined ? (result.ok ? result.data : { error: result.error, message: result.message }) : result;
    const formatted = OutputRenderer.render(rawData, format);
    stream.write(`${formatted}\n`);
  }
}

module.exports = {
  OutputRenderer,
  toToon,
  renderHuman
};

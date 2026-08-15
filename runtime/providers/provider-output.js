"use strict";

/**
 * Normalizes provider stdout into the assistant's plain-text response so that
 * downstream JSON parsers (refinement proposals, task-graph plans) can consume
 * either a single JSON object OR a structured JSON event stream (NDJSON).
 *
 * Support matrix:
 *  - Single JSON object (e.g. a codex --json execution) -> passthrough.
 *  - NDJSON event stream (e.g. `opencode run --format json` emitting
 *    step_start/text/step_finish events, or claude stream-json) -> the text
 *    parts are concatenated and returned.
 *  - Transport error event (`type: "error"`) -> returned verbatim so callers
 *    reject it instead of mistaking it for an empty/valid proposal.
 */
function extractAssistantText(stdout) {
  if (typeof stdout !== "string" || stdout.trim() === "") {
    return stdout;
  }
  const trimmed = stdout.trim();
  const lines = trimmed.split("\n");

  // Single-line output: already a plain JSON object/proposal (or a lone error).
  if (lines.length === 1) {
    return trimmed;
  }

  const textParts = [];
  for (const line of lines) {
    if (line.trim() === "") continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue; // non-JSON line (e.g. the prompt echo) -> ignore
    }
    if (!obj || typeof obj !== "object") continue;

    // A transport error must never be read as a proposal.
    if (obj.type === "error" || (obj.error && typeof obj.error === "object")) {
      return line;
    }

    const text =
      typeof obj.part?.text === "string" && obj.part?.type === "text"
        ? obj.part.text
        : typeof obj.text === "string"
          ? obj.text
          : undefined;
    if (text && text.trim() !== "") {
      textParts.push(text);
    }
  }

  return textParts.length > 0 ? textParts.join("\n") : stdout;
}

module.exports = { extractAssistantText };
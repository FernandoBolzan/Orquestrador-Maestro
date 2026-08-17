"use strict";

function isBunAvailable() { return typeof globalThis.Bun !== "undefined"; }

function score(query, title) {
  const q = query.trim().toLowerCase(); const text = title.toLowerCase();
  if (text.startsWith(q)) return 100 - text.length;
  const words = q.split(/\s+/u); return words.every((word) => text.includes(word)) ? 50 - text.length : -1;
}

function paletteFallback({ query, registry, ctx, state }) {
  const results = registry.available(ctx, state).map((command) => ({
    kind: "command", id: command.id, title: command.title, category: command.category, score: score(query, command.title)
  })).filter((item) => item.score >= 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { results, selected: results[0] || null, select: (index) => registry.execute(results[index].id, ctx) };
}

async function createHeadless({ width, height }) {
  if (!process.env.ORQUESTRADOR_TUI_BUN_E2E) throw new Error("Set ORQUESTRADOR_TUI_BUN_E2E=1 to enable Bun headless E2E");
  if (!isBunAvailable()) throw new Error("OpenTUI native FFI is unavailable: run this gate with Bun");
  const testing = await import("@opentui/core/testing");
  const harness = await testing.createTestRenderer({ width, height });
  const clock = new testing.ManualClock();
  return {
    renderer: harness.renderer, clock,
    async type(keys) { await harness.mockInput.pressKeys(keys); },
    async click(x, y) { return harness.mockMouse.click(x, y); },
    capture() { return harness.captureCharFrame(); },
    async waitIdle() { await harness.waitForVisualIdle(); },
    close() { harness.renderer.destroy(); }
  };
}

module.exports = { createHeadless, isBunAvailable, paletteFallback };

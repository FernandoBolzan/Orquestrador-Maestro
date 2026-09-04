"use strict";

function tierFor(columns, rows) {
  const width = Number(columns) || 0;
  const height = Number(rows) || 0;
  if (width < 70 || height < 24) return { tier: "compact", fallback: true };
  if (width >= 180 && height >= 50) return { tier: "ultrawide" };
  if (width >= 140) return { tier: "wide" };
  if (width >= 100 && height >= 30) return { tier: "normal" };
  return { tier: "compact" };
}

const COMPOSITIONS = Object.freeze({
  compact: { candidateWindows: ["pilot", "terminal"], dockCollapsed: true, overlayDefaults: { skills: "overlay", inspector: "overlay" } },
  normal: { candidateWindows: ["taskgraph", "inspector", "terminal"], dockCollapsed: false, overlayDefaults: { skills: "overlay", inspector: "tiled" } },
  wide: { candidateWindows: ["taskgraph", "inspector", "terminal", "skills"], dockCollapsed: true, overlayDefaults: { skills: "dock", inspector: "tiled" } },
  ultrawide: { candidateWindows: ["pilot", "taskgraph", "inspector", "terminal", "skills"], dockCollapsed: false, overlayDefaults: { skills: "floating", inspector: "floating" } }
});

function compositionFor(value) {
  const tier = typeof value === "string" ? value : value?.tier;
  const composition = COMPOSITIONS[tier];
  if (!composition) throw new Error(`Tier responsivo desconhecido: ${tier}`);
  return { ...composition, candidateWindows: [...composition.candidateWindows], overlayDefaults: { ...composition.overlayDefaults }, terminalRows: 6 };
}

module.exports = { tierFor, compositionFor };

"use strict";

const BASE_THEME = Object.freeze({
  canvas: "#05070b", surface: "#0a0f16", raised: "#101722", border: "#243244", borderMuted: "#162131",
  text: "#e6edf5", muted: "#8391a5", faint: "#526074", cyan: "#31d7ff", green: "#31e6a1",
  lime: "#b6f36b", orange: "#ffb454", violet: "#b99aff", red: "#ff6b7a", selection: "#14293a"
});

const SEMANTIC_TOKENS = Object.freeze({
  background: BASE_THEME.canvas,
  surface: BASE_THEME.surface,
  raised: BASE_THEME.raised,
  border: BASE_THEME.border,
  borderFocused: BASE_THEME.cyan,
  text: BASE_THEME.text,
  textMuted: BASE_THEME.muted,
  accent: BASE_THEME.cyan,
  running: BASE_THEME.green,
  ready: BASE_THEME.lime,
  success: BASE_THEME.green,
  warning: BASE_THEME.orange,
  danger: BASE_THEME.red,
  critical: BASE_THEME.red,
  blocked: BASE_THEME.red,
  attention: BASE_THEME.orange,
  selection: BASE_THEME.selection
});

module.exports = { BASE_THEME, SEMANTIC_TOKENS };

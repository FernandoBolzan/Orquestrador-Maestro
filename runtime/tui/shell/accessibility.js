"use strict";

const { SEMANTIC_TOKENS } = require("../theme/semantic-tokens");

const GLYPH_FALLBACKS = Object.freeze({ "★": "*", "⚠": "!", "●": "o", "◐": "o", "◇": "<>", "▸": ">", "⊘": "x", "✓": "v", "✕": "x", "⏱": "t" });
const WIREFRAME_GLYPHS = Object.freeze(Object.keys(GLYPH_FALLBACKS));

function enabled(value) {
  return value !== undefined && value !== null && value !== "" && value !== "0" && value !== "false";
}

function capabilities(env = {}) {
  const dumb = String(env.TERM || "").toLowerCase() === "dumb";
  const color = !Object.prototype.hasOwnProperty.call(env, "NO_COLOR") && !dumb;
  return Object.freeze({
    color,
    highContrast: enabled(env.HIGH_CONTRAST) || !color,
    reduceMotion: enabled(env.REDUCED_MOTION) || dumb,
    asciiGlyphs: dumb || enabled(env.ASCII_GLYPHS) || String(env.TERM || "").toLowerCase() === "unknown"
  });
}

function glyph(symbol, caps = {}) {
  return caps.asciiGlyphs ? (GLYPH_FALLBACKS[symbol] || String(symbol)) : String(symbol);
}

function focusIndicator({ focused, caps = {} }) {
  return focused ? glyph("▸", caps) : " ";
}

function tokenMap(caps = {}) {
  if (!caps.highContrast) return { ...SEMANTIC_TOKENS };
  return { ...SEMANTIC_TOKENS, background: "#000000", surface: "#000000", raised: "#101010", border: "#ffffff", borderFocused: "#00ffff", text: "#ffffff", textMuted: "#d0d0d0", accent: "#00ffff", selection: "#003b4a" };
}

const STATUS_GLYPHS = Object.freeze({ running: "●", ready: "◇", success: "✓", warning: "⚠", danger: "✕", critical: "✕", blocked: "⊘", attention: "⚠" });
function renderStatus(status, caps = {}) {
  return `${glyph(STATUS_GLYPHS[status] || "◇", caps)} ${String(status)}`;
}

module.exports = { capabilities, glyph, focusIndicator, tokenMap, renderStatus, WIREFRAME_GLYPHS, GLYPH_FALLBACKS };

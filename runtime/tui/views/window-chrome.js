"use strict";

const { SEMANTIC_TOKENS } = require("../theme/semantic-tokens");

function oneLine(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function chromeTitle(type, context, { attention = false } = {}) {
  return `${attention ? "⚠ " : ""}${oneLine(type)} · ${oneLine(context)}`;
}

function chromeBorderColor({ focused = false } = {}) {
  return focused ? SEMANTIC_TOKENS.accent : SEMANTIC_TOKENS.border;
}

module.exports = { chromeTitle, chromeBorderColor };

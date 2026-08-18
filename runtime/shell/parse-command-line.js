"use strict";

/**
 * Divide uma linha de comando preservando aspas (single/double) e
 * escapes simples. Usado pela TUI classica e pela extensao VS Code
 * (review PR#6 items 18 e 19): `node script.js --name "Jane Doe"`
 * torna-se 4 argumentos, nao 6.
 */
function parseCommandLine(input) {
  if (typeof input !== "string") throw new TypeError("input must be a string");
  const tokens = [];
  let current = "";
  let quote = null;
  let hasToken = false;
  let escaped = false;

  for (const char of input) {
    if (escaped) { current += char; escaped = false; hasToken = true; continue; }
    if (char === "\\" && quote !== "'") { escaped = true; continue; }
    if (quote) {
      if (char === quote) { quote = null; continue; }
      current += char; hasToken = true; continue;
    }
    if (char === "'" || char === '"') { quote = char; hasToken = true; continue; }
    if (/\s/u.test(char)) {
      if (hasToken) { tokens.push(current); current = ""; hasToken = false; }
      continue;
    }
    current += char; hasToken = true;
  }

  if (escaped) { current += "\\"; hasToken = true; }
  if (quote) throw new Error("unterminated quote in command line");
  if (hasToken) tokens.push(current);
  return tokens;
}

module.exports = { parseCommandLine };
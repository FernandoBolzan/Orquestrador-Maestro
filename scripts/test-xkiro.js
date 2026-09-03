#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_BASE_URL = "https://api.xkiro.com/v1";
const DEFAULT_MODEL = "qwen/qwen3-vl-plus:free";
const DEFAULT_PROMPT = "Responda apenas: OK";

function validateBaseUrl(url) {
  const parsed = new URL(url);
  if (parsed.protocol === "https:") return true;
  if (parsed.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)) {
    return true;
  }
  throw new Error(`HTTP not allowed with authenticated requests. Use HTTPS for: ${parsed.hostname}`);
}

function unquote(value) {
  return value.replace(/^(['"])(.*)\1$/, "$2");
}

function readDotEnvKey(envPath) {
  if (!fs.existsSync(envPath)) return "";

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(?:export\s+)?XKIRO_API_KEY\s*=\s*(.*?)\s*$/);
    if (match && match[1] && !match[1].startsWith("#")) return unquote(match[1]);
  }

  // Keep compatibility with the local one-line secret format without logging it.
  const nonEmpty = lines.map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  return nonEmpty.length === 1 && !nonEmpty[0].includes("=") ? unquote(nonEmpty[0]) : "";
}

function readApiKey() {
  return process.env.XKIRO_API_KEY?.trim() || readDotEnvKey(path.resolve(process.cwd(), ".env"));
}

function redact(value, secret) {
  return String(value).replaceAll(secret, "[REDACTED]");
}

async function main() {
  const apiKey = readApiKey();
  if (!apiKey) {
    console.error("XKIRO_API_KEY não definida. Use uma variável de ambiente ou .env local.");
    process.exitCode = 2;
    return;
  }

  const baseUrl = (process.env.XKIRO_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  validateBaseUrl(baseUrl);
  const model = process.env.XKIRO_MODEL || DEFAULT_MODEL;
  const prompt = process.env.XKIRO_TEST_PROMPT || DEFAULT_PROMPT;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 8 }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok || body.error) {
      const message = body.error?.message || `HTTP ${response.status}`;
      throw new Error(`xKiro request failed (${response.status}): ${redact(message, apiKey)}`);
    }

    console.log(JSON.stringify({
      httpStatus: response.status,
      id: body.id,
      model: body.model || model,
      content: body.choices?.[0]?.message?.content ?? null,
      usage: body.usage || null,
    }, null, 2));
  } catch (error) {
    console.error(redact(error.message, apiKey));
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
}

if (require.main === module) main();

module.exports = { readDotEnvKey, redact, validateBaseUrl };

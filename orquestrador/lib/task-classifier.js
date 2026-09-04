#!/usr/bin/env node
"use strict";

function classifyTask(taskText) {
  if (!taskText || typeof taskText !== "string") {
    return { class: "trivial", reason: "empty or invalid task text" };
  }

  const text = taskText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const resumedPatterns = [
    /continue\s+(a\s+)?(correcao|trabalho|implementacao|feature|fix)/i,
    /resume\s+(the\s+)?(fix|work|implementation|feature)/i,
    /continue\s+from\s+(yesterday|previous|last\s+session)/i,
    /continue\s+the\s+fix/i,
    /what\s+we\s+were\s+doing/i,
    /continue\s+working\s+on/i,
    /resume\s+from/i
  ];

  if (resumedPatterns.some(p => p.test(text))) {
    return { class: "resumed", reason: "continuation keyword detected" };
  }

  const investigationPatterns = [
    /investigate/i,
    /debug/i,
    /diagnose/i,
    /find\s+(the\s+)?root\s+cause/i,
    /why\s+(is|are|does|do)/i,
    /what\s+(is|are|causing)/i,
    /analyze/i
  ];

  if (investigationPatterns.some(p => p.test(text))) {
    return { class: "investigation", reason: "investigation keyword detected" };
  }

  const complexPatterns = [
    /implement/i,
    /create\s+(a\s+)?(new\s+)?(system|feature|module|component|service)/i,
    /build\s+(a\s+)?(new\s+)?(system|feature|module|component|service)/i,
    /refactor/i,
    /migrate/i,
    /redesign/i,
    /architecture/i,
    /integrate\s+(with|and)/i
  ];

  if (complexPatterns.some(p => p.test(text))) {
    return { class: "complex", reason: "complex action keyword detected" };
  }

  const boundedPatterns = [
    /add\s+(a\s+)?(new\s+)?(function|method|test|case|feature)/i,
    /fix\s+(the\s+)?(bug|issue|error|problem)/i,
    /update\s+(the\s+)?(code|function|method|test)/i,
    /change\s+(the\s+)?(text|label|color|size)/i,
    /rename/i
  ];

  if (boundedPatterns.some(p => p.test(text))) {
    return { class: "bounded", reason: "bounded action keyword detected" };
  }

  if (text.length < 30) {
    return { class: "trivial", reason: "short task text" };
  }

  return { class: "bounded", reason: "default classification" };
}

module.exports = { classifyTask };

---
name: skill-agent-observability
description: Define observabilidade para agentes e aplicações de IA com eventos, tracing, custos, latência, qualidade, regressões e privacidade.
category: observability
risk: medium
source: orquestrador-native
---

# Agent Observability

Define a minimal event taxonomy for runs, steps, tool calls, retries, failures, tokens, cost, latency, approvals, and outcomes. Redact secrets and personal data. Prefer OpenTelemetry-compatible spans when infrastructure supports it. Add dashboards or reports for success rate, tool failure rate, p50/p95 latency, cost per task, human intervention, and regression comparisons. Do not claim quality improvement without a baseline.

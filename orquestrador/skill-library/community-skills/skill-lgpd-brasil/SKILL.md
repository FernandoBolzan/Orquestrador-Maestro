---
name: skill-lgpd-brasil
description: LGPD-focused privacy and data-governance skill for Brazilian software products. Use for data mapping, legal basis selection, consent, privacy notices, RIPD, rights requests, retention, vendor risk, incident response, and international transfer review.
category: compliance
risk: high
source: local-privacy-patterns
---

# skill-lgpd-brasil

## When To Use

Use this skill when the task involves Brazilian privacy and data protection work, especially:

- Personal data or sensitive personal data processing.
- Privacy notices, cookie banners, consent flows, or preference centers.
- Data subject requests, incident handling, retention, deletion, or audit trails.
- RIPD, processing records, vendor or processor reviews, or international transfers.
- AI, analytics, CRM, support, WhatsApp, email, or admin flows that touch personal data.

## Operating Model

1. Identify the role model first: controller, operator, sub-operator, joint controller, and encarregado/DPO.
2. Build a factual data map before drafting policy text or code.
3. Assign a legal basis per purpose; do not default everything to consent.
4. Record data categories, purpose, source, sharing, retention, deletion, and access path.
5. For high-risk processing, prepare or update a RIPD.
6. For incidents, preserve evidence, isolate scope, assess impact, and document notification decisions.
7. Verify that the final policy or implementation matches the real system behavior.

## Core Artifacts

Recommended LGPD workspace artifacts:

- `.lgpd/data-map.md`
- `.lgpd/processing-record.md`
- `.lgpd/legal-basis.md`
- `.lgpd/consent-ledger.md`
- `.lgpd/privacy-notice.md`
- `.lgpd/dsar-playbook.md`
- `.lgpd/ripd.md`
- `.lgpd/vendor-register.md`
- `.lgpd/retention-policy.md`
- `.lgpd/incident-response.md`

## Scope Checklist

- Personal data, sensitive personal data, and children's data.
- Controller, operator, sub-operator, joint controller, and encarregado/DPO.
- Purpose limitation, adequacy, necessity, transparency, security, prevention, non-discrimination, and accountability.
- Rights requests: access, correction, deletion, anonymization, portability, information about sharing, consent revocation, and review of automated decisions.
- International transfers, subprocessors, backups, logs, and retention.
- AI datasets, prompts, transcripts, recordings, embeddings, and training corpora.

## Guardrails

1. Do not claim legal compliance or certification.
2. Do not recommend collecting personal data without a purpose and retention rule.
3. Do not store raw personal data in docs, logs, or examples when a redacted identifier is enough.
4. Treat consent as revocable and distinct from other legal bases.
5. Keep policies aligned with actual product behavior and vendor contracts.
6. Escalate to legal counsel for formal notices, contractual language, or regulator-facing decisions.

## Validation

- Confirm each processing purpose has a legal basis and retention rule.
- Confirm the privacy notice matches collected fields and third-party sharing.
- Confirm DSAR and consent-revocation flows are testable.
- Confirm incident and transfer controls are documented.
- Confirm telemetry and forms do not leak unnecessary personal data.

## Related Skills

- `gdpr-data-handling`
- `legal-advisor`
- `security-compliance-compliance-check`
- `skill-supabase-rls`
- `skill-saas-security-scan`
- `skill-security-hooks`
- `skill-unified-analytics`
- `skill-ai-orchestration`
- `skill-google-workspace-sync`
- `skill-evolution-api`

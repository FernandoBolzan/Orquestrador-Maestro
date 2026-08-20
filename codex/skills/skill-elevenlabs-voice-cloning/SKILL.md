---
name: skill-elevenlabs-voice-cloning
description: Use for ElevenLabs voice generation and voice cloning integrations, including Brazilian Portuguese TTS, explicit voice consent, server-side API keys, secure audio uploads, asynchronous jobs, validation, retryable synthesis, and safe handling of biometric voice data.
category: ai
risk: high
source: elevenlabs-api-patterns
last_verified: 2026-08-06
---

# ElevenLabs Voice Cloning

Use this skill for voice cloning, text-to-speech, preview generation, and voice asset management. Treat voice samples and cloned voices as sensitive biometric data.

## Core Workflow

1. Confirm the user has explicit rights and consent to upload, clone, synthesize, and retain the voice.
2. Keep ElevenLabs API keys server-side. Use a backend proxy or service for cloning, synthesis, previews, and voice management.
3. Validate audio before upload or processing: type, size, duration, sample rate, loudness, speech presence, and tenant quota.
4. Store source audio and generated speech in private storage with signed URLs, retention windows, and tenant isolation.
5. Create a durable `voice_jobs` record for clone and long synthesis requests; process through workers or queues.
6. Use idempotency keys for clone requests, preview generation, and synthesis retries.
7. Store provider voice IDs, consent record IDs, input checksums, model/settings versions, and deletion state.
8. Redact transcript text and file names from logs when they may contain personal data.

## Brazilian Portuguese Defaults

Use these as starting values, then tune with real samples:

```typescript
const voiceSettings = {
  stability: 0.35,
  similarity_boost: 1.0,
  style: 0.0,
  use_speaker_boost: true
};
```

Prefer 2 to 5 minutes of clean, natural speech with varied intonation. Reject samples with background music, other speakers, clipping, or unclear rights.

## Current API Boundary

- Use the official `@elevenlabs/elevenlabs-js` package or HTTP API from the server. The current TTS route is `POST https://api.elevenlabs.io/v1/text-to-speech/:voice_id` with `model_id` selected from `GET /v1/models`.
- Do not hardcode a removed v1 model. In particular, `eleven_monolingual_v1` and `eleven_multilingual_v1` are deprecated and scheduled for removal on 2026-07-09; prefer a currently listed multilingual/Flash/Turbo model and verify availability at deploy time.
- Capture provider request IDs and character-cost headers for support and cost accounting without logging voice content.

## Consent and Safety

- Store consent actor, voice owner, allowed use, retention period, revocation path, source file checksum, and timestamp.
- Require a deletion workflow that removes local assets and provider-side voices when consent is revoked or retention expires.
- Add human review before publishing cloned voice output for customer-facing or paid workflows.
- Do not expose provider voice IDs in a way that allows cross-tenant access.

## Verification

- Test clone success, invalid audio, missing consent, duplicate retry, synthesis timeout, provider failure, deletion, and signed URL expiry.
- Confirm browser bundles do not contain ElevenLabs secrets.
- Confirm revoked consent blocks queued synthesis and triggers cleanup.

## Official References

- https://elevenlabs.io/docs/api-reference/introduction/
- https://elevenlabs.io/docs/api-reference/models/list
- https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- https://elevenlabs.io/docs/changelog

## Related Skills

- `skill-ai-orchestration`
- `skill-manual-video-processing`
- `skill-live-processing`

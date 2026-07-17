# Source layout

See `docs/MULTI_CHANNEL_ARCHITECTURE.md` for the full explanation of why this is structured as a shared core + thin channel adapters — read that first if anything here is unclear.

- `funnel/` — **channel-agnostic core**, shared by every platform.
  - `messages.js` — all message copy, mirrors `docs/WHATSAPP_FUNNEL.md` exactly.
  - `router.js` — the core state machine: given a session + incoming text, decides the reply and next state. Pure function, no side effects, fully unit tested (`router.test.js`).
  - `rateLimiter.js` — per-conversation abuse prevention, keyed generically (works across channels).
  - `core.js` — `processIncomingMessage(channel, externalId, text, sendFn)`: the single entry point every channel webhook calls. Handles rate limiting, session get/set, routing, Airtable persistence, and deletion — identically regardless of channel.
- `whatsapp/` — WhatsApp-specific adapter: `client.js` (send via Meta Cloud API), `webhookRoutes.js` (receive + parse WhatsApp's payload shape). **Fully live.**
- `messenger/` — Messenger-specific adapter, same shape as `whatsapp/`. **Scaffolded, not yet activated** — see `docs/MULTI_CHANNEL_ARCHITECTURE.md` for setup steps.
- `instagram/` — Instagram-specific adapter, same shape. **Scaffolded, not yet activated.**
- `server.js` — the single Express app; mounts all three channels' webhook routers plus `/health`, and runs the shared session-purge interval.
- `db/sessionStore.js` — **switcher**: automatically selects the Supabase-backed store (`sessionStore.supabase.js`) when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, otherwise falls back to the in-memory store (`sessionStore.memory.js`) for local development. Both implement the identical interface. Session keys are namespaced per channel (`whatsapp:<id>`, `messenger:<id>`, `instagram:<id>`). See `supabase/migrations/001_whatsapp_sessions.sql` for the required table.
- `db/airtable.js` — CRM persistence, generalized across channels via `createFoundingSupplierRecord(session, channel, externalId)` and `deleteFoundingSupplierRecordByContact(channel, externalId)`. See `docs/CRM_SCHEMA.md`.
- `ai/` — not yet built. This is where Phase 1's plain-language tender summarization will live, and where Path 2's placeholder response gets replaced with real AI-assisted answering.

## Status

- Menu routing (Paths 1–4) is implemented and tested.
- The Founding Supplier interview (Path 1, Q1–Q7) is implemented, including graceful "stop"/"skip" mid-interview. On completion, responses are persisted to the Founding Suppliers Airtable table with a `Channel` and `Contact ID` field identifying which platform the conversation came from. A persistence failure is logged for manual follow-up but never blocks the user's completion reply.
- Path 2 sends the placeholder response only — no AI answering yet.
- Rate limiting and graceful handling of non-text messages (images, documents, audio) are implemented on WhatsApp — neither silently drops nor crashes, both reply with a clear message. See `docs/WHATSAPP_FUNNEL.md`, System Messages.
- A `GET /health` endpoint is available for uptime monitoring.
- "delete my data" clears both the session and any matching Airtable record (looked up by `Contact ID`, so it works identically across channels) via `deleteFoundingSupplierRecordByContact`. Run the migration in `supabase/migrations/001_whatsapp_sessions.sql` and set `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` before relying on this in production — without them, sessions fall back to in-memory and won't survive a server restart.
- WhatsApp is fully live end-to-end. Messenger and Instagram are structurally complete and unit-tested against the shared core, but not yet connected to real Meta credentials or tested against live traffic.

## Running locally

```bash
cp .env.example .env   # fill in real credentials for whichever channel(s) you're testing
npm install
npm test                # run the full test suite
npm run dev             # starts src/server.js, mounting all channel webhooks on one port
```

You'll need a tunnel (e.g. ngrok) to expose your local webhook to Meta's servers for testing against real messages. WhatsApp's callback stays at `/webhook`; Messenger and Instagram are `/webhook/messenger` and `/webhook/instagram` respectively.

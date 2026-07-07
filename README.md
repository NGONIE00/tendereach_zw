# Source layout (Phase 1 MVP)

- `whatsapp/` — WhatsApp Cloud API integration.
  - `messages.js` — all message copy, mirrors `docs/WHATSAPP_FUNNEL.md` exactly.
  - `router.js` — the core state machine: given a session + incoming text, decides the reply and next state. Pure function, no side effects, fully unit tested (`router.test.js`).
  - `client.js` — sends outbound messages via the Meta Cloud API.
  - `webhook.js` — Express server: receives inbound messages, calls the router, persists session state, sends the reply.
- `db/sessionStore.js` — **switcher**: automatically selects the Supabase-backed store (`sessionStore.supabase.js`) when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, otherwise falls back to the in-memory store (`sessionStore.memory.js`) for local development. Both implement the identical interface. See `supabase/migrations/001_whatsapp_sessions.sql` for the required table.
- `ai/` — not yet built. This is where Phase 1's plain-language tender summarization will live, and where Path 2's placeholder response gets replaced with real AI-assisted answering.

## Status

- Menu routing (Paths 1–4) is implemented and tested.
- The Founding Supplier interview (Path 1, Q1–Q7) is implemented, including graceful "stop"/"skip" mid-interview. On completion, responses are persisted directly to the Founding Suppliers Airtable table via `src/db/airtable.js` (see `docs/CRM_SCHEMA.md` for the field mapping). A persistence failure is logged for manual follow-up but never blocks the user's completion reply.
- Path 2 sends the placeholder response only — no AI answering yet.
- Rate limiting (`src/whatsapp/rateLimiter.js`) and graceful handling of non-text messages (images, documents, audio) are implemented — neither silently drops nor crashes, both reply with a clear message. See `docs/WHATSAPP_FUNNEL.md`, System Messages.
- A `GET /health` endpoint is available for uptime monitoring.
- "delete my data" clears both the session (Supabase or in-memory, whichever is active) and any matching Airtable record (by phone number lookup) via `deleteFoundingSupplierRecordByPhone`. Run the migration in `supabase/migrations/001_whatsapp_sessions.sql` and set `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` before relying on this in production — without them, sessions fall back to in-memory and won't survive a server restart.

## Running locally

```bash
cp .env.example .env   # fill in real WhatsApp Cloud API credentials
npm install
npm test                # run the router test suite
npm run dev             # start the webhook server locally
```

You'll need a tunnel (e.g. ngrok) to expose your local webhook to Meta's servers for testing against real WhatsApp messages.

<<<<<<< HEAD
# TenderReach

**Plain-language tender support for Zimbabwean suppliers — starting small, staying honest.**

TenderReach helps suppliers understand and act on public procurement tender notices they already have access to. It does not scrape, mirror, or redistribute PRAZ's eGP System data in bulk. Every tender processed by TenderReach is one a supplier or citizen brought to us voluntarily.

## What this is (Phase 0–1)

A WhatsApp-based assistant that takes a tender notice a supplier already found (via PRAZ's eGP portal, the Government Gazette, or elsewhere) and returns:

- A plain-language summary of requirements
- A document checklist
- A deadline reminder

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full phased plan, [`docs/ETHICS.md`](docs/ETHICS.md) for the concrete privacy and data-ethics commitments this project makes and keeps, [`docs/WHATSAPP_FUNNEL.md`](docs/WHATSAPP_FUNNEL.md) for the exact WhatsApp welcome funnel copy currently in use, and [`docs/CRM_SCHEMA.md`](docs/CRM_SCHEMA.md) for the two-tier supplier database structure. See [`docs/ONBOARDING_FORM.md`](docs/ONBOARDING_FORM.md) for the Founding Supplier onboarding form fields, and [`docs/MULTI_CHANNEL_ARCHITECTURE.md`](docs/MULTI_CHANNEL_ARCHITECTURE.md) for how WhatsApp, Messenger, and Instagram share one funnel core.

## What this is not

- Not a scraper or bulk republisher of PRAZ data.
- Not a public scoring/rating system for suppliers or government entities (that is a possible, conditional, later phase — see the roadmap).
- Not affiliated with or endorsed by PRAZ. TenderReach is an independent, civil-society-style tool that aims to extend Zimbabwe's public transparency goals, not to replace or speak for any government institution.

## Status

Early build — Phase 0/1 (problem validation + MVP). Not yet in production use.

## License

TBD — recommend a permissive open-source license (e.g. MIT or Apache-2.0) to align with the open-contracting/civic-tech norms this project follows. See `LICENSE` once added.

## Security

Please see [`SECURITY.md`](SECURITY.md) before reporting any vulnerability. Do not open public issues for security concerns.
=======
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
>>>>>>> 91cf82ea2ebc1ddb33cc55fed080127e6a650420

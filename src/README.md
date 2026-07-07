# Source layout (Phase 1 MVP)

- `whatsapp/` — WhatsApp Cloud API integration.
  - `messages.js` — all message copy, mirrors `docs/WHATSAPP_FUNNEL.md` exactly.
  - `router.js` — the core state machine: given a session + incoming text, decides the reply and next state. Pure function, no side effects, fully unit tested (`router.test.js`).
  - `client.js` — sends outbound messages via the Meta Cloud API.
  - `webhook.js` — Express server: receives inbound messages, calls the router, persists session state, sends the reply.
- `db/sessionStore.js` — in-memory session store (dev-only placeholder). Tracks each phone number's position in the funnel. **Must be swapped for a real persistent store (Supabase) before production** — see the warning comment at the top of that file.
- `ai/` — not yet built. This is where Phase 1's plain-language tender summarization will live, and where Path 2's placeholder response gets replaced with real AI-assisted answering.

## Status

- Menu routing (Paths 1–4) is implemented and tested.
- The Founding Supplier interview (Path 1, Q1–Q7) is implemented, including graceful "stop"/"skip" mid-interview and a completion signal (`__interviewCompleted`) that marks where CRM persistence (`docs/CRM_SCHEMA.md`) will plug in — not yet wired to Airtable/Supabase.
- Path 2 sends the placeholder response only — no AI answering yet.
- "delete my data" is handled by the router but session storage is in-memory only right now, so this doesn't yet reflect a real production guarantee — fix this before treating the deletion promise in `docs/ETHICS.md` as live.

## Running locally

```bash
cp .env.example .env   # fill in real WhatsApp Cloud API credentials
npm install
npm test                # run the router test suite
npm run dev             # start the webhook server locally
```

You'll need a tunnel (e.g. ngrok) to expose your local webhook to Meta's servers for testing against real WhatsApp messages.

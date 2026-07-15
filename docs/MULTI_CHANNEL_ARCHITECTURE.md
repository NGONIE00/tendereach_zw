# Multi-Channel Architecture

TenderReach's funnel logic (`src/funnel/`) is channel-agnostic by design. WhatsApp, Messenger, and Instagram are three thin adapters plugged into the same core — not three separate copies of the interview/menu logic. This document explains the pattern and what's needed to fully activate each channel.

## The pattern

```
src/funnel/
  messages.js   — all copy (docs/WHATSAPP_FUNNEL.md), shared by every channel
  router.js     — pure state machine: (session, text) -> (reply, sessionUpdates)
  rateLimiter.js— per-conversation abuse prevention, keyed generically
  core.js       — processIncomingMessage(channel, externalId, text, sendFn):
                  the shared handler every channel webhook calls

src/whatsapp/   — WhatsApp-specific: client.js (send), webhookRoutes.js (receive)
src/messenger/  — Messenger-specific: client.js (send), webhookRoutes.js (receive)
src/instagram/  — Instagram-specific: client.js (send), webhookRoutes.js (receive)

src/server.js   — one Express app, mounts all three webhook routers
```

A channel adapter's only job is: parse that platform's inbound payload shape into `(externalId, text)`, hand it to `processIncomingMessage`, and provide a `sendFn(externalId, body)` that knows how to actually deliver a reply on that platform. Everything else — which question comes next, what gets saved, when the interview is "complete," rate limiting, deletion — lives once, in `src/funnel/`.

**Why this matters practically:** a change to the Founding Supplier interview questions, the consent line, or the deletion behavior is a single edit in `src/funnel/`, automatically correct on every channel. Nothing channel-specific needs to be touched or kept in sync by hand.

## Session identity across channels

Every session is keyed as `${channel}:${externalId}` — e.g. `whatsapp:263785128177`, `messenger:8392019283`, `instagram:1772039485`.

**Deliberate simplification:** the same person messaging TenderReach on WhatsApp and then again on Instagram is currently treated as two separate, unrelated conversations. We don't attempt to merge identities across platforms. This is intentional for now:

- There's no reliable way to know two different platform IDs belong to the same person without asking them directly (and even then, trusting a self-report).
- Attempting to merge identities silently would be a bigger data-linking decision than this stage of the product needs — see `docs/ETHICS.md`'s data minimization principle.
- If this becomes a real problem in practice, the fix is an explicit, opt-in "link my accounts" flow, not an automatic backend merge.

## What's live vs. scaffolded

| Channel | Status |
|---|---|
| WhatsApp | Fully live — real business number connected, permanent token, tested end-to-end |
| Messenger | Scaffolded, not yet activated — needs a Facebook Page, Messenger product setup, and `MESSENGER_PAGE_ACCESS_TOKEN` / `MESSENGER_VERIFY_TOKEN` in `.env`. Code is structurally complete and unit-tested against the shared core; not yet tested against Meta's real Messenger payloads. |
| Instagram | Scaffolded, not yet activated — needs an Instagram professional account linked to the same Facebook Page, Instagram product setup, and `INSTAGRAM_PAGE_ACCESS_TOKEN` / `INSTAGRAM_VERIFY_TOKEN` in `.env`. Same maturity level as Messenger. |

## Activating Messenger or Instagram (when ready)

Both follow the same broad steps as the WhatsApp setup already completed:

1. Create/connect a Facebook Page for TenderReach (Instagram requires this Page to have a linked Instagram professional account too).
2. In the Meta App Dashboard, add the **Messenger** and/or **Instagram** product.
3. Generate a **Page Access Token** (this is different from the WhatsApp token — Messenger and Instagram share the same Page token, WhatsApp does not).
4. Set the corresponding env vars (see `.env.example`).
5. Register the webhook callback URL — `https://your-domain/webhook/messenger` or `https://your-domain/webhook/instagram` — with a verify token matching your `.env`, same handshake pattern as WhatsApp's.
6. Subscribe the webhook to the `messages` field.
7. Send a real test message and confirm it routes through `src/funnel/core.js` correctly — the funnel logic itself needs no changes at this point, only the webhook registration.

## CRM implications

The Founding Suppliers Airtable table now includes:
- **Channel** — which platform the record came from (WhatsApp / Messenger / Instagram)
- **Contact ID** — `${channel}:${externalId}`, the stable lookup key used for deletion requests
- **Phone** — only populated for WhatsApp, since Messenger/Instagram IDs aren't phone numbers

See `docs/CRM_SCHEMA.md` for the full field reference, and `docs/ETHICS.md` for how these platform-specific identifiers are treated under the existing privacy commitments.

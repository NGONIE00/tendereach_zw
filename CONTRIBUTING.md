# Contributing to TenderReach

## Before you start

Read, in this order:
1. `README.md` — what this project is and isn't
2. `docs/ROADMAP.md` — which phase we're in and what's in/out of scope right now
3. `docs/ETHICS.md` — the concrete privacy/data commitments that constrain every feature
4. `SECURITY.md` — baseline security practices

## Setup

```bash
git clone <repo-url>
cd tendereach
cp .env.example .env   # then fill in real values — never commit .env
npm install
npm run dev
```

## Ground rules for any change

- **No automated scraping of PRAZ or any government portal.** If a feature seems to require it, stop and raise it as a discussion issue first — this is a deliberate project-wide constraint, not an oversight.
- **No new data collection field without a corresponding line in `docs/ETHICS.md`.** If you're storing something new, document why, and how long it's retained, in the same pull request.
- **WhatsApp funnel copy lives in `docs/WHATSAPP_FUNNEL.md` first.** Update that file before changing the live bot's messages, so the two never drift apart.
- **Prospect data and Founding Supplier data are never merged into one table.** See `docs/CRM_SCHEMA.md`. A prospect only gets a Founding Supplier record after they've actually engaged — never automatically.
- **No scraping of paid tender-aggregator sites** (Tendertube, TendersInfo, ZimbabweTenders, GlobalTenders, or similar). Tender content comes only from original public sources or from users directly. See `docs/ETHICS.md`.
- **No public-facing scoring, rating, or reputational claims about named suppliers/agencies.** This is gated behind Phase 4 and a legal review — see the roadmap.
- **Run `npm audit` before opening a PR** that adds or updates dependencies.
- **Secrets never touch source control.** If you accidentally commit one, rotate it immediately and note it in the PR — don't just force-push over it.

## Commit style

Keep commits small and descriptive. Reference the roadmap phase where relevant, e.g. `[Phase 1] Add plain-language summary prompt template`.

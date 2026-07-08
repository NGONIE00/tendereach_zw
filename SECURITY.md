# Security Policy

TenderReach handles messages from real suppliers and citizens, some of whom may be reporting sensitive concerns about government contracts. Security and confidentiality are treated as core requirements, not afterthoughts.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email: security@tendereach.example (replace with a real monitored address before launch) with:
- A description of the issue
- Steps to reproduce, if applicable
- Your assessment of impact

We aim to acknowledge reports within 5 business days.

## Baseline Security Practices for This Project

- **No secrets in source control.** All API keys, WhatsApp Business API tokens, and database credentials live in environment variables, never committed. See `.env.example` for the required variable names only (no real values).
- **Dependency hygiene.** Dependencies are kept minimal and reviewed before adding. Run `npm audit` (or equivalent) before each release.
- **Data minimization by default.** Only store what is functionally necessary (see `docs/ETHICS.md`). Tender notice content submitted by users is processed and, where possible, not retained longer than needed to deliver the summary/reminder.
- **No plaintext phone number logging in application logs.** Phone numbers are the primary identifier in a WhatsApp-based tool and are treated as sensitive personal data.
- **Least privilege.** Any database or API credentials used should have the minimum scope needed (e.g. a Supabase service role key should never be exposed client-side).
- **Encrypted transport only.** All external calls (WhatsApp Business API, AI provider, database) must use HTTPS/TLS — no exceptions.
- **Rate limiting on inbound messages** to prevent abuse of the AI summarization pipeline (cost control and misuse prevention). Implemented in `src/whatsapp/rateLimiter.js` — default 20 messages per 10-minute sliding window per phone number, configurable via `RATE_LIMIT_MAX_MESSAGES` / `RATE_LIMIT_WINDOW_MS`.

## Known Sensitive Areas

- **Tip-line submissions (Phase 2)** may involve people reporting concerns about government contracts or specific suppliers. Treat submitter identity as confidential by default; do not publish any identifying information without explicit consent.
- **Any future scoring/scorecard feature (Phase 4)** requires a legal review pass (defamation risk) before any code reaches production — this is a process gate, not just a technical one.

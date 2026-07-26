# Procurement Knowledge Centre — Sourcing & Ethics Notes

This documents the tender-index feature referenced on the About page
(`docs/about.html#procurement-knowledge-centre`) and implemented in
`src/tenders/`. Add a short pointer to this file from `docs/ETHICS.md`
and a dated changelog line, per the project's existing practice of
documenting every material data-collection decision there.

## What this is

A regularly refreshed index of PRAZ's public "Latest Tenders" bulletin
board (egp.praz.org.zw), stored in a `tenders` table (see
`supabase/migrations/002_tenders.sql`) and used to power Tender Reach's
own search, alerts, and AI-assisted answers.

## Why this is a different call than the original "no scraping" stance

Earlier project decisions (see `docs/ROADMAP.md`, Phase 1) deliberately
avoided automated bulk access to PRAZ's system, given ambiguity in their
Terms & Conditions around third-party reuse. Revisiting that now, with
more direct evidence in hand:

- The Latest Tenders listing and individual tender detail pages are
  served **without any authentication** — confirmed by fetching them
  directly with no login.
- These same pages are **indexed by public search engines**, meaning
  PRAZ has not technically blocked crawling of this specific content.
- The fields collected here (tender ID, reference number, title,
  category, procuring entity, publish/closing dates) are exactly the
  fields **already displayed openly** to any visitor — nothing behind a
  login, no bid documents, no supplier data.

This is still not a legal guarantee of permission — PRAZ's Terms &
Conditions (see the earlier research in this project's history) assign
ownership of "Information" to PRAZ or the issuing agency, and remain
silent on third-party automated reuse specifically. The practical
mitigation is scope and conduct, not a claim of clear legal cover:

- **Scope limited strictly to the public listing and detail pages** —
  never the authenticated supplier area, never bid documents.
- **Rate-limited and identified** — `src/tenders/scrapePraz.js` waits
  `REQUEST_DELAY_MS` (2 seconds) between page requests and sends a
  descriptive User-Agent identifying Tender Reach and a contact email,
  rather than posing as a browser.
- **Not a resale product** — this index is never sold, published as a
  standalone dataset, or offered as an API to third parties. It exists
  only to make Tender Reach's own guidance current.
- **If PRAZ ever objects**, the correct response is to stop immediately
  and pursue the data-sharing conversation this project originally
  recommended (see `docs/ROADMAP.md` Phase 3) — not to argue the point.

## Operational notes

- Run `node src/tenders/run.js` on a schedule (every 6–12 hours is
  plenty — PRAZ's bulletin board doesn't change fast enough to justify
  more frequent polling, and gentler polling is kinder to their
  infrastructure). A scheduled GitHub Action or a simple cron job on
  whatever host runs the main server both work.
- If `scrapeListingPage` starts returning zero rows, PRAZ's markup has
  likely changed — inspect the live page source and adjust the
  selectors in `scrapePraz.js` before assuming something else broke.
- New dependencies needed: `cheerio` (HTML parsing) and
  `@supabase/supabase-js` (already a dependency for session storage).
  Run `npm install cheerio` before using this module.
- Add `"scrape:tenders": "node src/tenders/run.js"` to `package.json`
  scripts for convenience.

## Retention

Tenders remain in the table indefinitely by default (useful for
historical/award-pattern queries later), refreshed on `last_seen_at`
each time they're re-scraped. If storage becomes a concern, add a
periodic cleanup of rows with `closing_date` more than, say, 12 months
in the past.

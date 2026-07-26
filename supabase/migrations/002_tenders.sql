-- Tenders index table — populated by src/tenders/scrapePraz.js.
--
-- Source: PRAZ's public eGP bulletin board (egp.praz.org.zw), specifically
-- the "Latest Tenders" listing and individual tender detail pages. These
-- pages are served without authentication and are indexed by search
-- engines — this table only ever stores fields already visible there to
-- any visitor. See docs/ETHICS.md and docs/MULTI_CHANNEL_ARCHITECTURE.md
-- (or docs/PROCUREMENT_KNOWLEDGE_CENTRE.md) for the sourcing rationale.
--
-- This table is NOT a resale product — it exists only to power Tender
-- Reach's own search, alerts, and AI-assisted answers.

create table if not exists tenders (
  tender_id text primary key,           -- PRAZ's own numeric tender ID (from the detail page URL)
  reference_number text,
  title text not null,
  category_codes text,                  -- comma-separated, as PRAZ sometimes lists multiple
  category_names text,
  procuring_entity text,
  scope text,                           -- e.g. "Open"
  publish_date timestamptz,
  closing_date timestamptz,
  source_url text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Fast lookups for "what's open now" and "closing soon" queries — the
-- exact use case this table exists to serve for the AI assistant.
create index if not exists tenders_closing_date_idx on tenders (closing_date);
create index if not exists tenders_category_codes_idx on tenders (category_codes);
create index if not exists tenders_procuring_entity_idx on tenders (procuring_entity);

-- Same RLS posture as whatsapp_sessions: only ever accessed via the
-- service role key from the scraper/server, never from a client context.
alter table tenders enable row level security;

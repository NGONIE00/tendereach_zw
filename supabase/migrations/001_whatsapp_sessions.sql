-- Sessions table backing src/db/sessionStore.supabase.js.
-- Tracks each phone number's position in the WhatsApp funnel
-- (docs/WHATSAPP_FUNNEL.md) so it survives server restarts, unlike the
-- in-memory dev store (src/db/sessionStore.memory.js).
--
-- Retention/deletion: see docs/ETHICS.md. A row here is deleted entirely
-- (not soft-deleted) on user request or after the retention window —
-- this table intentionally holds no data needed after that point, since
-- completed interview *content* lives in Airtable (docs/CRM_SCHEMA.md),
-- not here.

create table if not exists whatsapp_sessions (
  phone_number text primary key, -- now used as a generic channel-prefixed
                                  -- session key (e.g. "whatsapp:263...",
                                  -- "messenger:892..."), not phone numbers
                                  -- only — see docs/MULTI_CHANNEL_ARCHITECTURE.md.
                                  -- Column name kept as-is to avoid an
                                  -- unnecessary migration; it's just a string key.
  current_path text, -- null | 'path1' | 'path2' | 'path3' | 'path4'
  interview_step integer not null default 0,
  interview_answers jsonb not null default '[]'::jsonb,
  internal_tag text not null default 'Cold Lead',
  created_at timestamptz not null default now(),
  last_active timestamptz not null default now()
);

-- Speeds up the retention-window purge query (see purgeExpiredSessions).
create index if not exists whatsapp_sessions_last_active_idx
  on whatsapp_sessions (last_active);

-- Row Level Security: this table is only ever accessed via the service
-- role key from the webhook server (never from a client/browser context),
-- so RLS stays enabled with no public policies — service role bypasses
-- RLS by design in Supabase.
alter table whatsapp_sessions enable row level security;

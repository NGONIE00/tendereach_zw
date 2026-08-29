-- Allows the browser (using the public anon key, never the service role
-- key) to read the tenders table directly for the Knowledge Centre's
-- search/filter/table feature.
--
-- Safe to expose publicly: this table only ever contains fields already
-- shown openly on PRAZ's public "Latest Tenders" bulletin board (see
-- docs/PROCUREMENT_KNOWLEDGE_CENTRE.md) — nothing sensitive, nothing
-- from an authenticated area. Write access remains restricted to the
-- service role key used by the scraper (src/tenders/) only.

create policy "Public read access for tenders"
  on tenders
  for select
  using (true);

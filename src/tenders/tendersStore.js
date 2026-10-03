const { createClient } = require("@supabase/supabase-js");

let _client = null;
function client() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check your .env file.");
    }
    _client = createClient(url, key);
  }
  return _client;
}

/**
 * Upserts scraped tenders into the `tenders` table.
 *
 * HARDENING: rows are de-duplicated by tender_id before sending.
 * The scraper pages through PRAZ's listing over ~80 seconds, and the
 * listing can shift while it does (new tenders are added at the top),
 * so the same tender can show up on two consecutive pages. Postgres
 * rejects an upsert batch that contains the same key twice ("ON
 * CONFLICT DO UPDATE command cannot affect row a second time"), which
 * would drop the entire chunk. De-duplicating first avoids that.
 */
async function upsertTenders(tenders) {
  if (!tenders || tenders.length === 0) return { upserted: 0 };

  const nowIso = new Date().toISOString();
  const byId = new Map();
  let skippedNoId = 0;

  for (const t of tenders) {
    if (!t.tender_id) {
      skippedNoId += 1;
      continue;
    }
    byId.set(t.tender_id, { ...t, last_seen_at: nowIso }); // last occurrence wins
  }

  const rows = Array.from(byId.values());
  const duplicates = tenders.length - skippedNoId - rows.length;

  if (duplicates > 0) {
    console.log(`[tendersStore] Dropped ${duplicates} duplicate tender(s) from this scrape.`);
  }
  if (skippedNoId > 0) {
    console.warn(`[tendersStore] Skipped ${skippedNoId} row(s) with no tender_id.`);
  }

  // The website only lists tenders with a FUTURE closing date, so a row
  // whose date failed to parse would be saved but never shown. Surface
  // that here instead of letting it fail silently.
  const missingDates = rows.filter((r) => !r.closing_date).length;
  if (missingDates > 0) {
    console.warn(
      `[tendersStore] ${missingDates} of ${rows.length} tenders have no parseable closing date and will not appear on the website.`
    );
  }

  const CHUNK_SIZE = 200;
  let totalUpserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error, count } = await client()
      .from("tenders")
      .upsert(chunk, { onConflict: "tender_id", count: "exact" });

    if (error) {
      console.error("[tendersStore] Upsert failed for a chunk:", error.message);
      throw error;
    }
    totalUpserted += count || chunk.length;
  }

  return { upserted: totalUpserted };
}

/** Open tenders matching a category code, soonest-closing first. */
async function findOpenTendersByCategory(categoryCode) {
  const { data, error } = await client()
    .from("tenders")
    .select("*")
    .ilike("category_codes", `%${categoryCode}%`)
    .gt("closing_date", new Date().toISOString())
    .order("closing_date", { ascending: true });

  if (error) throw error;
  return data;
}

module.exports = { upsertTenders, findOpenTendersByCategory };

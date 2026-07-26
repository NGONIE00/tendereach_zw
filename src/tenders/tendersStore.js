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
 * Upserts a batch of scraped tenders into the `tenders` table (see
 * supabase/migrations/002_tenders.sql). Existing rows (matched by
 * tender_id) get `last_seen_at` refreshed; new rows get `first_seen_at`
 * set via the table's default.
 */
async function upsertTenders(tenders) {
  if (!tenders || tenders.length === 0) return { upserted: 0 };

  const rows = tenders.map((t) => ({
    ...t,
    last_seen_at: new Date().toISOString(),
  }));

  // Batch in chunks to stay well under any request size limits.
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

/**
 * Convenience query the AI assistant (src/ai/) can build on: open tenders
 * matching a category code, ordered by soonest-closing first.
 */
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

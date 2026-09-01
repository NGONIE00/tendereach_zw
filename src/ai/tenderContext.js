/**
 * Pulls a handful of currently open tenders from Supabase to give
 * askGemini() real, current context — grounds answers instead of
 * letting the model guess at what's currently available.
 *
 * Best-effort: if this fails (Supabase not configured, network issue),
 * callers should still proceed without context rather than failing the
 * whole answer — see answerProcurementQuestion.js.
 */

async function getTenderContextText() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return ""; // no context available — caller proceeds without it
  }

  const nowIso = new Date().toISOString();
  const restUrl =
    `${supabaseUrl}/rest/v1/tenders?select=title,category_names,procuring_entity,closing_date` +
    `&closing_date=gt.${encodeURIComponent(nowIso)}` +
    `&order=closing_date.asc&limit=8`;

  const res = await fetch(restUrl, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!res.ok) return "";

  const tenders = await res.json();
  if (!Array.isArray(tenders) || tenders.length === 0) return "";

  return (
    "Some currently open tenders you can reference if relevant (do not invent others beyond this list):\n" +
    tenders
      .map(
        (t) =>
          `- ${t.title} (${t.category_names || "uncategorized"}) — ${t.procuring_entity}, closes ${t.closing_date}`
      )
      .join("\n")
  );
}

module.exports = { getTenderContextText };

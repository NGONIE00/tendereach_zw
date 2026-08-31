/**
 * Knowledge Centre page logic — two independent features:
 *  1. Tender search/filter/table, reading directly from Supabase
 *     (public anon key, safe — see supabase/migrations/003_public_tenders_read.sql)
 *  2. AI Q&A widget, calling the /api/ask serverless function
 *     (keeps the Gemini key server-side — see docs/api/ask.js)
 *
 * Requires the Supabase JS client to be loaded on the page first:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * and these two constants filled in below with your real project values.
 *
 * NOTE on categories: PRAZ's real "Required Supplier Category Name"
 * values are long descriptive phrases (e.g. "Electrical Products:
 * Cables and Materials, Power Back-Up Equipment, Transformers..."),
 * not simple single words — a tender can also list several codes/names
 * comma-separated in one field. A fixed dropdown of generic labels
 * ("Construction", "ICT", etc.) would silently never match real data.
 * Instead, the category filter below is populated dynamically from the
 * distinct category CODES actually present in your scraped data —
 * codes are short and stable (e.g. "GE001"), unlike the long names.
 */

const SUPABASE_URL ="https://njbvwidesxizthxjzkku.supabase.co"; 
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYnZ3aWRlc3hpenRoeGp6a2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTMyNzksImV4cCI6MjA5OTE2OTI3OX0.4PGc2rSbJlXoth9shHWCpP86tohR-4F6RRe7PHYVz74"; 

let supabaseClient = null;
function getSupabaseClient() {
  if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

/* ---------- Category filter: populated from real data ---------- */

async function loadCategoryOptions() {
  const client = getSupabaseClient();
  const select = document.getElementById("tender-category-filter");
  if (!client || !select) return;

  try {
    const { data, error } = await client
      .from("tenders")
      .select("category_codes, category_names")
      .not("category_codes", "is", null)
      .limit(500);

    if (error || !data) {
      console.error("[knowledge-centre] Failed to load categories:", error && error.message);
      return;
    }

    const seen = new Map(); // code -> a representative short label

    data.forEach((row) => {
      const codes = (row.category_codes || "").split(",").map((c) => c.trim()).filter(Boolean);
      const names = (row.category_names || "").split(",").map((n) => n.trim()).filter(Boolean);
      codes.forEach((code, i) => {
        if (!seen.has(code)) {
          const fullName = names[i] || names[0] || code;
          const shortLabel = fullName.length > 40 ? fullName.slice(0, 40).trim() + "…" : fullName;
          seen.set(code, shortLabel);
        }
      });
    });

    const sortedCodes = Array.from(seen.keys()).sort();
    sortedCodes.forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = `${code} — ${seen.get(code)}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("[knowledge-centre] Unexpected error loading categories:", err.message);
  }
}

/* ---------- Tender search / filter / table ---------- */

async function loadTenders() {
  const client = getSupabaseClient();
  const resultsBody = document.getElementById("tender-results-body");
  const statusEl = document.getElementById("tender-search-status");
  if (!client || !resultsBody) return;

  const searchTerm = document.getElementById("tender-search-input").value.trim();
  const categoryCode = document.getElementById("tender-category-filter").value;

  statusEl.textContent = "Searching…";
  resultsBody.innerHTML = "";

  try {
    let query = client
      .from("tenders")
      .select("title, reference_number, category_names, procuring_entity, closing_date, source_url, category_codes")
      .order("closing_date", { ascending: true })
      .limit(30);

    if (searchTerm) {
      query = query.ilike("title", `%${searchTerm}%`);
    }
    if (categoryCode) {
      query = query.ilike("category_codes", `%${categoryCode}%`);
    }

    const { data, error } = await query;

    if (error) {
      statusEl.textContent = "Couldn't load tenders right now — please try again shortly.";
      console.error("[knowledge-centre] Supabase query error:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      statusEl.textContent = "No matching tenders found.";
      return;
    }

    statusEl.textContent = `${data.length} tender${data.length === 1 ? "" : "s"} found.`;
    data.forEach((t) => {
      const row = document.createElement("tr");
      const closing = t.closing_date ? new Date(t.closing_date).toLocaleDateString() : "—";
      const categoryDisplay = (t.category_names || "—").split(",")[0].trim();
      row.innerHTML = `
        <td>${escapeHtml(t.title || "Untitled")}</td>
        <td>${escapeHtml(categoryDisplay)}</td>
        <td>${escapeHtml(t.procuring_entity || "—")}</td>
        <td>${closing}</td>
        <td>${t.source_url ? `<a href="${escapeHtml(t.source_url)}" target="_blank" rel="noopener">View →</a>` : "—"}</td>
      `;
      resultsBody.appendChild(row);
    });
  } catch (err) {
    statusEl.textContent = "Something went wrong loading tenders.";
    console.error("[knowledge-centre] Unexpected error:", err.message);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- AI Q&A widget ---------- */

async function askQuestion() {
  const input = document.getElementById("ai-question-input");
  const responseEl = document.getElementById("ai-response");
  const askBtn = document.getElementById("ai-ask-btn");
  const question = input.value.trim();
  if (!question) return;

  askBtn.disabled = true;
  askBtn.textContent = "Thinking…";
  responseEl.innerHTML = "";

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();

    if (!res.ok) {
      responseEl.innerHTML = `<p class="meta">${escapeHtml(
        data.error || "The assistant isn't available right now — try WhatsApp instead."
      )} <a href="contact.html">Ask on WhatsApp →</a></p>`;
      return;
    }

    responseEl.innerHTML = `<p>${escapeHtml(data.answer)}</p>`;
  } catch (err) {
    responseEl.innerHTML = `<p class="meta">Couldn't reach the assistant. <a href="contact.html">Ask on WhatsApp →</a></p>`;
    console.error("[knowledge-centre] /api/ask request failed:", err.message);
  } finally {
    askBtn.disabled = false;
    askBtn.textContent = "Ask";
  }
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", function () {
  const searchBtn = document.getElementById("tender-search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", loadTenders);
    document.getElementById("tender-search-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadTenders();
    });
    loadCategoryOptions();
    loadTenders();
  }

  const askBtn = document.getElementById("ai-ask-btn");
  if (askBtn) {
    askBtn.addEventListener("click", askQuestion);
    document.getElementById("ai-question-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") askQuestion();
    });
  }
});

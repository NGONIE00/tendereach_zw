/**
 * Knowledge Centre page logic:
 *  1. Tender search/filter/table with pagination, reading directly from
 *     Supabase (public anon key, safe — see
 *     supabase/migrations/003_public_tenders_read.sql)
 *  2. AI Q&A widget, calling the /api/ask serverless function
 *     (keeps the Gemini key server-side — see docs/api/ask.js)
 *
 * Requires the Supabase JS client loaded first:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * and SUPABASE_URL / SUPABASE_ANON_KEY filled in below.
 */

const SUPABASE_URL ="https://njbvwidesxizthxjzkku.supabase.co"; 
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYnZ3aWRlc3hpenRoeGp6a2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTMyNzksImV4cCI6MjA5OTE2OTI3OX0.4PGc2rSbJlXoth9shHWCpP86tohR-4F6RRe7PHYVz74"; 


const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 400;
const MIN_SEARCH_LENGTH = 2; // avoid firing a broad query on every single keystroke

let supabaseClient = null;
function getSupabaseClient() {
  if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

let currentPage = 1;
let totalPages = 1;
let sortAscending = true; // closing date sort direction
let searchDebounceTimer = null;

/**
 * Escapes a user-typed search term for safe use inside a PostgREST
 * `.or()` filter string and `.ilike()` pattern:
 *  - Escapes literal "%" and "_" so a user typing them doesn't act as
 *    an unintended SQL wildcard.
 *  - Strips characters that are syntactically meaningful to PostgREST's
 *    filter-string grammar itself (commas, parentheses) rather than
 *    trying to escape them, since PostgREST has no escape sequence for
 *    them inside an .or() string — stripping is the safe choice here.
 */
function sanitizeSearchTerm(raw) {
  return raw
    .replace(/[,()]/g, "")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .trim();
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

    const seen = new Map();
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

    Array.from(seen.keys())
      .sort()
      .forEach((code) => {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = `${code} — ${seen.get(code)}`;
        select.appendChild(opt);
      });
  } catch (err) {
    console.error("[knowledge-centre] Unexpected error loading categories:", err.message);
  }
}

/* ---------- Tender search / filter / sort / paginate ---------- */

async function loadTenders(resetToFirstPage = true) {
  const client = getSupabaseClient();
  const resultsBody = document.getElementById("tender-results-body");
  const statusEl = document.getElementById("tender-search-status");
  const paginationEl = document.getElementById("tender-pagination");
  if (!client || !resultsBody) return;

  if (resetToFirstPage) currentPage = 1;

  const rawSearchTerm = document.getElementById("tender-search-input").value.trim();
  const searchTerm = sanitizeSearchTerm(rawSearchTerm);
  const categoryCode = document.getElementById("tender-category-filter").value;

  statusEl.textContent = "Searching…";
  resultsBody.innerHTML = "";

  try {
    let query = client
      .from("tenders")
      .select(
        "reference_number, title, category_names, procuring_entity, closing_date, source_url, category_codes",
        { count: "exact" }
      )
      .order("closing_date", { ascending: sortAscending });

    if (searchTerm.length >= MIN_SEARCH_LENGTH) {
      query = query.or(
        `title.ilike.%${searchTerm}%,procuring_entity.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%`
      );
    }
    if (categoryCode) {
      query = query.ilike("category_codes", `%${categoryCode}%`);
    }

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      statusEl.textContent = "Couldn't load tenders right now — please try again shortly.";
      console.error("[knowledge-centre] Supabase query error:", error.message);
      paginationEl.innerHTML = "";
      return;
    }

    if (!data || data.length === 0) {
      statusEl.textContent = "No matching tenders found.";
      paginationEl.innerHTML = "";
      return;
    }

    totalPages = Math.max(1, Math.ceil((count || data.length) / PAGE_SIZE));
    statusEl.textContent = `${count} tender${count === 1 ? "" : "s"} found — page ${currentPage} of ${totalPages}.`;

    data.forEach((t) => {
      const row = document.createElement("tr");
      const closing = t.closing_date ? new Date(t.closing_date).toLocaleDateString() : "—";
      const categoryDisplay = (t.category_names || "—").split(",")[0].trim();
      row.innerHTML = `
        <td>${escapeHtml(t.reference_number || "—")}</td>
        <td class="tender-title-cell" title="${escapeHtml(t.title || "")}">${escapeHtml(t.title || "Untitled")}</td>
        <td>${escapeHtml(categoryDisplay)}</td>
        <td>${escapeHtml(t.procuring_entity || "—")}</td>
        <td>${closing}</td>
        <td>${t.source_url ? `<a href="${escapeHtml(t.source_url)}" target="_blank" rel="noopener">View →</a>` : "—"}</td>
      `;
      resultsBody.appendChild(row);
    });

    renderPagination(paginationEl);
  } catch (err) {
    statusEl.textContent = "Something went wrong loading tenders.";
    console.error("[knowledge-centre] Unexpected error:", err.message);
  }
}

function renderPagination(container) {
  container.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "← Prev";
  prevBtn.className = "btn-outline";
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener("click", () => {
    currentPage -= 1;
    loadTenders(false);
  });

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next →";
  nextBtn.className = "btn-outline";
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener("click", () => {
    currentPage += 1;
    loadTenders(false);
  });

  const pageLabel = document.createElement("span");
  pageLabel.className = "pagination-label";
  pageLabel.textContent = `Page ${currentPage} of ${totalPages}`;

  container.appendChild(prevBtn);
  container.appendChild(pageLabel);
  container.appendChild(nextBtn);
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
  const searchInput = document.getElementById("tender-search-input");
  const categorySelect = document.getElementById("tender-category-filter");
  const sortBtn = document.getElementById("tender-sort-closing");

  if (searchBtn) {
    searchBtn.addEventListener("click", () => loadTenders(true));

    // Ease-of-search: live search-as-you-type, debounced so it doesn't
    // fire a query on every keystroke.
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => loadTenders(true), SEARCH_DEBOUNCE_MS);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(searchDebounceTimer);
        loadTenders(true);
      }
    });

    categorySelect.addEventListener("change", () => loadTenders(true));

    if (sortBtn) {
      sortBtn.addEventListener("click", () => {
        sortAscending = !sortAscending;
        sortBtn.textContent = sortAscending ? "Closing ↑" : "Closing ↓";
        loadTenders(false);
      });
    }

    loadCategoryOptions();
    loadTenders(true);
  }

  const askBtn = document.getElementById("ai-ask-btn");
  if (askBtn) {
    askBtn.addEventListener("click", askQuestion);
    document.getElementById("ai-question-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") askQuestion();
    });
  }
});

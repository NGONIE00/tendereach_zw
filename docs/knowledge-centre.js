/**
 * Knowledge Centre page logic:
 *  1. Tender search/filter/table with pagination, caching (see the
 *     Cache section) — reads from Supabase directly.
 *  2. AI Q&A widget — now a real conversational thread with multi-turn
 *     memory, calling /api/ask (keeps the Gemini key server-side).
 *
 * Requires the Supabase JS client loaded first:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * and SUPABASE_URL / SUPABASE_ANON_KEY filled in below.
 */

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 400;
const MIN_SEARCH_LENGTH = 2;

let supabaseClient = null;
function getSupabaseClient() {
  if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

let currentPage = 1;
let totalPages = 1;
let sortAscending = true;
let searchDebounceTimer = null;

/* ============================================================
   CLIENT-SIDE CACHE (tender search only — chat history has its
   own separate in-memory array below, not cached/persisted)
   ============================================================ */

const CACHE_PREFIX = "tr_cache_";
const CATEGORY_CACHE_KEY = CACHE_PREFIX + "categories";
const CATEGORY_CACHE_TTL_MS = 30 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 3 * 60 * 1000;

function readCache(storage, key, ttlMs) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const { value, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > ttlMs) {
      storage.removeItem(key);
      return null;
    }
    return value;
  } catch (err) {
    return null;
  }
}

function writeCache(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify({ value, cachedAt: Date.now() }));
  } catch (err) {
    console.warn("[knowledge-centre] Cache write skipped:", err.message);
  }
}

function searchCacheKey(searchTerm, categoryCode, page, ascending) {
  return `${CACHE_PREFIX}search_${searchTerm}|${categoryCode}|${page}|${ascending}`;
}

/* ---------- Category filter ---------- */

async function loadCategoryOptions() {
  const client = getSupabaseClient();
  const select = document.getElementById("tender-category-filter");
  if (!client || !select) return;

  const cached = readCache(localStorage, CATEGORY_CACHE_KEY, CATEGORY_CACHE_TTL_MS);
  if (cached) {
    populateCategorySelect(select, cached);
    return;
  }

  try {
    const { data, error } = await client
      .from("tenders")
      .select("category_codes, category_names")
      .not("category_codes", "is", null)
      .limit(500);

    if (error || !data) return;

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

    const options = Array.from(seen.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, label]) => ({ code, label }));

    writeCache(localStorage, CATEGORY_CACHE_KEY, options);
    populateCategorySelect(select, options);
  } catch (err) {
    console.error("[knowledge-centre] Unexpected error loading categories:", err.message);
  }
}

function populateCategorySelect(select, options) {
  options.forEach(({ code, label }) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${code} — ${label}`;
    select.appendChild(opt);
  });
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

  const cacheKey = searchCacheKey(searchTerm, categoryCode, currentPage, sortAscending);
  const cached = readCache(sessionStorage, cacheKey, SEARCH_CACHE_TTL_MS);
  if (cached) {
    totalPages = cached.totalPages;
    renderResults(cached.rows, cached.count, resultsBody, statusEl);
    renderPagination(paginationEl);
    return;
  }

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
      paginationEl.innerHTML = "";
      return;
    }
    if (!data || data.length === 0) {
      statusEl.textContent = "No matching tenders found.";
      paginationEl.innerHTML = "";
      return;
    }

    totalPages = Math.max(1, Math.ceil((count || data.length) / PAGE_SIZE));
    writeCache(sessionStorage, cacheKey, { rows: data, count, totalPages });
    renderResults(data, count, resultsBody, statusEl);
    renderPagination(paginationEl);
  } catch (err) {
    statusEl.textContent = "Something went wrong loading tenders.";
    console.error("[knowledge-centre] Unexpected error:", err.message);
  }
}

function renderResults(rows, count, resultsBody, statusEl) {
  statusEl.textContent = `${count} tender${count === 1 ? "" : "s"} found — page ${currentPage} of ${totalPages}.`;
  resultsBody.innerHTML = "";
  rows.forEach((t) => {
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
}

function sanitizeSearchTerm(raw) {
  return raw.replace(/[,()]/g, "").replace(/%/g, "\\%").replace(/_/g, "\\_").trim();
}

function renderPagination(container) {
  container.innerHTML = "";
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "← Prev";
  prevBtn.className = "btn-outline";
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener("click", () => { currentPage -= 1; loadTenders(false); });

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next →";
  nextBtn.className = "btn-outline";
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener("click", () => { currentPage += 1; loadTenders(false); });

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

/* ============================================================
   AI Q&A — CONVERSATIONAL CHAT THREAD
   ============================================================
   Maintains real multi-turn history client-side (in memory only —
   not persisted across page reloads, and never cached/stored, since
   this may contain whatever the user chooses to ask). Sent with each
   request so /api/ask can give Gemini the full conversation context,
   not just the latest message in isolation.
   ============================================================ */

let chatHistory = []; // [{ role: "user"|"model", text: string }]

function appendChatBubble(role, text) {
  const thread = document.getElementById("ai-chat-thread");
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble chat-bubble-${role}`;
  bubble.textContent = text;
  thread.appendChild(bubble);
  thread.scrollTop = thread.scrollHeight;
  return bubble;
}

function appendTypingBubble() {
  const thread = document.getElementById("ai-chat-thread");
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble chat-bubble-model chat-bubble-typing";
  bubble.id = "ai-typing-bubble";
  bubble.innerHTML = "<span></span><span></span><span></span>";
  thread.appendChild(bubble);
  thread.scrollTop = thread.scrollHeight;
}

function removeTypingBubble() {
  const bubble = document.getElementById("ai-typing-bubble");
  if (bubble) bubble.remove();
}

async function askQuestion() {
  const input = document.getElementById("ai-question-input");
  const askBtn = document.getElementById("ai-ask-btn");
  const question = input.value.trim();
  if (!question) return;

  appendChatBubble("user", question);
  input.value = "";
  askBtn.disabled = true;
  appendTypingBubble();

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history: chatHistory }),
    });
    const data = await res.json();

    removeTypingBubble();

    if (!res.ok) {
      appendChatBubble(
        "model",
        (data.error || "The assistant isn't available right now — try WhatsApp instead.") + " (Ask on WhatsApp via the Contact page.)"
      );
      return;
    }

    appendChatBubble("model", data.answer);
    chatHistory.push({ role: "user", text: question });
    chatHistory.push({ role: "model", text: data.answer });
  } catch (err) {
    removeTypingBubble();
    appendChatBubble("model", "Couldn't reach the assistant. Try again, or ask on WhatsApp via the Contact page.");
    console.error("[knowledge-centre] /api/ask request failed:", err.message);
  } finally {
    askBtn.disabled = false;
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
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => loadTenders(true), SEARCH_DEBOUNCE_MS);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { clearTimeout(searchDebounceTimer); loadTenders(true); }
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

/**
 * POST /api/ask
 * Body: { question: string, history?: Array<{role: "user"|"model", text: string}> }
 *
 * Proxies a procurement question to Gemini, keeping GEMINI_API_KEY
 * server-side. Now supports real multi-turn conversation: pass the
 * prior turns as `history` and Gemini sees the whole thread, not just
 * the latest question in isolation — genuine conversational memory,
 * not just chat-bubble styling on the frontend.
 *
 * System instruction kept in sync by hand with
 * docs/api/_shared/gemini.js — if you change one, change the other.
 *
 * Requires these Vercel Environment Variables:
 *   GEMINI_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const GEMINI_MODEL = "gemini-3.6-flash";
const MAX_HISTORY_TURNS = 10; // caps context size/cost — plenty for a real conversation

const SYSTEM_INSTRUCTION = `You are Tender Reach's procurement assistant, helping Zimbabwean suppliers understand public tenders and the PRAZ procurement process.

SCOPE — you only answer questions about:
- Zimbabwean public procurement, tenders, and the PRAZ eGP process
- Supplier registration, compliance, and eligibility requirements for public tenders
- Understanding or interpreting a specific tender notice
- General guidance on preparing a bid or tender submission

If a question is NOT about one of these topics — including general knowledge, other countries' procurement systems, personal advice unrelated to procurement, coding help, or anything else — politely decline and redirect. Use language close to: "I'm built specifically to help with Zimbabwean public procurement and tenders — I can't help with that, but feel free to ask me anything about tenders, PRAZ, or supplier registration." Do not answer the off-topic question even partially first.

STYLE:
- Plain, simple language — avoid legal jargon.
- Concise: a few short paragraphs at most.
- If asked about a specific tender you don't have information on, say so honestly rather than guessing, and suggest forwarding the tender notice on WhatsApp for a detailed summary.
- Never invent tender details, deadlines, or requirements you don't actually have.
- You may reference earlier parts of this conversation naturally.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { question, history } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "Missing 'question' in request body." });
    return;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    res.status(503).json({
      error: "AI assistant isn't configured yet — GEMINI_API_KEY is missing from this deployment's environment variables.",
    });
    return;
  }

  let tenderContext = "";
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const nowIso = new Date().toISOString();
      const restUrl =
        `${supabaseUrl}/rest/v1/tenders?select=title,category_names,procuring_entity,closing_date` +
        `&closing_date=gt.${encodeURIComponent(nowIso)}` +
        `&order=closing_date.asc&limit=8`;
      const tendersRes = await fetch(restUrl, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      if (tendersRes.ok) {
        const tenders = await tendersRes.json();
        if (Array.isArray(tenders) && tenders.length > 0) {
          tenderContext =
            "\n\nSome currently open tenders you can reference if relevant (do not invent others beyond this list):\n" +
            tenders
              .map((t) => `- ${t.title} (${t.category_names || "uncategorized"}) — ${t.procuring_entity}, closes ${t.closing_date}`)
              .join("\n");
        }
      }
    }
  } catch (err) {
    console.error("[api/ask] Tender context fetch failed (continuing without it):", err.message);
  }

  // Build the multi-turn contents array: prior history first, then the
  // new question. Each history item's role must already be "user" or
  // "model" (Gemini's expected values) — validated/sanitized here so a
  // malformed client payload can't break the request shape.
  const safeHistory = Array.isArray(history)
    ? history
        .filter((turn) => turn && (turn.role === "user" || turn.role === "model") && typeof turn.text === "string")
        .slice(-MAX_HISTORY_TURNS)
        .map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] }))
    : [];

  const contents = [...safeHistory, { role: "user", parts: [{ text: question }] }];

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION + tenderContext }] },
        generationConfig: { maxOutputTokens: 900, temperature: 0.3 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[api/ask] Gemini API error:", geminiRes.status, errText);
      res.status(502).json({ error: "The AI provider returned an error. Please try again shortly." });
      return;
    }

    const geminiData = await geminiRes.json();
    const answer =
      geminiData.candidates &&
      geminiData.candidates[0] &&
      geminiData.candidates[0].content &&
      geminiData.candidates[0].content.parts &&
      geminiData.candidates[0].content.parts[0] &&
      geminiData.candidates[0].content.parts[0].text;

    if (!answer) {
      res.status(502).json({ error: "No answer was returned. Please try rephrasing your question." });
      return;
    }

    res.status(200).json({ answer: answer.trim() });
  } catch (err) {
    console.error("[api/ask] Unexpected error:", err.message);
    res.status(500).json({ error: "Something went wrong answering your question. Please try again." });
  }
}

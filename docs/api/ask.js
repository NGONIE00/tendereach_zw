/**
 * POST /api/ask
 * Body: { question: string }
 *
 * Proxies a procurement question to Gemini, keeping GEMINI_API_KEY
 * server-side (never exposed to the browser). Optionally grounds the
 * answer in a handful of currently-open tenders pulled from Supabase
 * (server-side, using the service role key — also never exposed).
 *
 * Requires these Vercel Environment Variables to be set before this
 * works (Project Settings -> Environment Variables):
 *   GEMINI_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Until those are set, this returns a clear "not configured yet" error
 * rather than failing silently or pretending to answer.
 */

const GEMINI_MODEL = "gemini-1.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { question } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "Missing 'question' in request body." });
    return;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    res.status(503).json({
      error:
        "AI assistant isn't configured yet — GEMINI_API_KEY is missing from this deployment's environment variables.",
    });
    return;
  }

  // Best-effort grounding: pull a few currently-open tenders so the
  // model has real, current context rather than answering from
  // training data alone. If this fails (e.g. Supabase not configured),
  // we still answer the general question — just without live examples.
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
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      if (tendersRes.ok) {
        const tenders = await tendersRes.json();
        if (Array.isArray(tenders) && tenders.length > 0) {
          tenderContext =
            "\n\nSome currently open tenders you can reference if relevant (do not invent others beyond this list):\n" +
            tenders
              .map(
                (t) =>
                  `- ${t.title} (${t.category_names || "uncategorized"}) — ${t.procuring_entity}, closes ${t.closing_date}`
              )
              .join("\n");
        }
      }
    }
  } catch (err) {
    console.error("[api/ask] Tender context fetch failed (continuing without it):", err.message);
  }

  const systemInstruction =
    "You are Tender Reach's procurement assistant, helping Zimbabwean suppliers understand public tenders and the PRAZ procurement process. Answer in plain, simple language, avoid legal jargon, and keep answers concise (a few short paragraphs at most). If asked about a specific tender you don't have information on, say so honestly and suggest the supplier forward the tender notice on WhatsApp for a detailed summary — don't guess at details." +
    tenderContext;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: question }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
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

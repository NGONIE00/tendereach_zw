/**
 * Core Gemini client — shared by the WhatsApp funnel's Path 2 (see
 * src/ai/answerProcurementQuestion.js, and its copy in
 * docs/api/_shared/ for the serverless deployment) and mirrored by
 * docs/api/ask.js.
 *
 * MODEL NAME: gemini-1.5-flash was discontinued by Google — confirmed
 * via a live query against https://generativelanguage.googleapis.com/v1beta/models
 * using your own API key. If this model is ever retired too, re-run
 * that same URL (with your key appended as ?key=YOUR_KEY) to see
 * exactly what's currently available, rather than guessing — Google
 * has changed model names/availability multiple times.
 *
 * TOPIC GUARDRAIL: enforced via a strong, explicit system instruction,
 * not a keyword filter — see the reasoning in this file's history if
 * you're wondering why no keyword pre-filter exists here.
 */

const GEMINI_MODEL = "gemini-3.6-flash";

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
- Never invent tender details, deadlines, or requirements you don't actually have.`;

/**
 * Calls Gemini with the procurement-scoped system instruction.
 * @param {string} question - the user's question
 * @param {string} [tenderContext] - optional extra context (e.g. a list
 *   of currently open tenders) appended to the system instruction so
 *   the model can reference real, current data rather than guessing.
 * @returns {Promise<string>} the answer text
 */
async function askGemini(question, tenderContext = "") {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const systemInstruction = SYSTEM_INSTRUCTION + (tenderContext ? `\n\n${tenderContext}` : "");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: question }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const answer =
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text;

  if (!answer) {
    throw new Error("Gemini returned no answer text.");
  }

  return answer.trim();
}

module.exports = { askGemini, SYSTEM_INSTRUCTION };

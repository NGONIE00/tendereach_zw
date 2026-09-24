const GEMINI_MODEL = "gemini-3.6-flash";
const MAX_HISTORY_TURNS = 10; // 10 user+model pairs — real memory without unbounded cost growth

const SYSTEM_INSTRUCTION = `You are Tender Reach's procurement assistant, helping Zimbabwean suppliers understand public tenders and the PRAZ procurement process. You are speaking with suppliers over WhatsApp — keep replies conversational and readable on a phone screen.

SCOPE — you only answer questions about:
- Zimbabwean public procurement, tenders, and the PRAZ eGP process
- Supplier registration, compliance, and eligibility requirements for public tenders
- Understanding or interpreting a specific tender notice
- General guidance on preparing a bid or tender submission

If a question is NOT about one of these topics, politely decline and redirect: "I'm built specifically to help with Zimbabwean public procurement and tenders — I can't help with that, but feel free to ask me anything about tenders, PRAZ, or supplier registration." Do not answer the off-topic question even partially first.

CONVERSATION STYLE:
- Plain, simple language — avoid legal jargon.
- Concise: a few short paragraphs at most, formatted for WhatsApp (short lines, not dense blocks).
- If you don't have real information on a specific tender, say so honestly rather than guessing, and suggest the supplier forward the tender notice directly so you can review it.
- Never invent tender details, deadlines, or requirements you don't actually have.
- You have access to the conversation history below — use it. Reference earlier parts of the conversation naturally where relevant, and don't ask something the user already told you.

FOLLOW-UP QUESTIONS — this matters:
- After answering, you MAY ask ONE brief, genuinely relevant follow-up question to keep the conversation useful and moving — but only when there's a natural next question (e.g. they asked about registration, so you could ask what category they supply in). Do not force a follow-up onto every single reply; if the answer was complete and there's nothing useful to ask, just end there.
- Do NOT repeatedly promote the Founding Supplier Programme. Mention it AT MOST once across an entire conversation, briefly, and only if it's genuinely relevant to what the user is asking about (e.g. they're asking broad "how do I get started" questions). If you've already mentioned it earlier in this conversation, do not mention it again.`;

/**
 * Calls Gemini with the procurement-scoped system instruction and, now,
 * real multi-turn conversation history.
 *
 * @param {string} question - the user's latest question
 * @param {string} [tenderContext] - optional extra context (open tenders)
 * @param {Array<{role: "user"|"model", text: string}>} [history] - prior
 *   turns in this conversation, oldest first
 * @returns {Promise<string>} the answer text
 */
async function askGemini(question, tenderContext = "", history = []) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const systemInstruction = SYSTEM_INSTRUCTION + (tenderContext ? `\n\n${tenderContext}` : "");

  const safeHistory = Array.isArray(history)
    ? history
        .filter((turn) => turn && (turn.role === "user" || turn.role === "model") && typeof turn.text === "string")
        .slice(-MAX_HISTORY_TURNS * 2)
        .map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] }))
    : [];

  const contents = [...safeHistory, { role: "user", parts: [{ text: question }] }];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { maxOutputTokens: 900, temperature: 0.3 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const candidate = data.candidates && data.candidates[0];
  const answer =
    candidate &&
    candidate.content &&
    candidate.content.parts &&
    candidate.content.parts[0] &&
    candidate.content.parts[0].text;

  if (!answer) {
    throw new Error("Gemini returned no answer text.");
  }

  if (candidate.finishReason === "MAX_TOKENS") {
    console.warn("[gemini] Answer hit the token limit and may be truncated.");
  }

  return answer.trim();
}

module.exports = { askGemini, SYSTEM_INSTRUCTION };

const { askGemini } = require("./gemini");
const { getTenderContextText } = require("./tenderContext");

/**
 * Main entry point for answering a procurement question — used by
 * src/funnel/core.js for WhatsApp Path 2. Never throws: on any failure
 * it returns null so the caller falls back to messages.path2.placeholder.
 *
 * @param {string} question
 * @param {Array<{role: "user"|"model", text: string}>} [history] - real
 *   multi-turn conversation memory, oldest first
 * @returns {Promise<string|null>}
 */
async function answerProcurementQuestion(question, history = []) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[ai] GEMINI_API_KEY not set — falling back to placeholder response.");
    return null;
  }

  let tenderContext = "";
  try {
    tenderContext = await getTenderContextText();
  } catch (err) {
    console.error("[ai] Failed to fetch tender context (continuing without it):", err.message);
  }

  try {
    return await askGemini(question, tenderContext, history);
  } catch (err) {
    console.error("[ai] Gemini call failed:", err.message);
    return null;
  }
}

module.exports = { answerProcurementQuestion };

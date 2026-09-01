const { askGemini } = require("./gemini");
const { getTenderContextText } = require("./tenderContext");

/**
 * Main entry point for answering a procurement question — used by
 * src/funnel/core.js for WhatsApp Path 2. Never throws: on any failure
 * (missing API key, Gemini error, network issue) it returns null so
 * the caller can fall back to the existing placeholder message rather
 * than the user seeing a broken reply.
 *
 * @param {string} question
 * @returns {Promise<string|null>} the answer, or null if unavailable
 */
async function answerProcurementQuestion(question) {
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
    return await askGemini(question, tenderContext);
  } catch (err) {
    console.error("[ai] Gemini call failed:", err.message);
    return null;
  }
}

module.exports = { answerProcurementQuestion };

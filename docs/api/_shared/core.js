const { route } = require("./router");
const messages = require("./messages");
const { checkRateLimit } = require("./rateLimiter");
const sessionStore = require("./sessionStore");
const { createFoundingSupplierRecord, deleteFoundingSupplierRecordByContact } = require("./airtable");
const { answerProcurementQuestion } = require("./answerProcurementQuestion");

/**
 * ⚠️ THIS IS THE FLAT-FOLDER VERSION — goes to docs/api/_shared/core.js
 * ONLY. sessionStore/airtable/answerProcurementQuestion are direct
 * siblings in that folder, hence the "./" paths. Do NOT copy this into
 * src/funnel/core.js — that one needs "../db/..." and "../ai/..."
 * instead (a separate file, core-for-src-funnel.js).
 *
 * REDESIGN: no more closingPrompt / awaitingClosingReply state machine.
 * Real multi-turn memory now lives in session.aiConversationHistory —
 * capped at the last 10 exchanges, passed to Gemini on every call, and
 * persisted back to the session after each answer. Cleared whenever
 * Path 2 is freshly entered or the conversation ends via a farewell
 * phrase (see router.js).
 */
async function processIncomingMessage(channel, externalId, text, sendFn) {
  const sessionKey = `${channel}:${externalId}`;

  const rateLimitResult = checkRateLimit(sessionKey);
  if (!rateLimitResult.allowed) {
    await sendFn(externalId, messages.rateLimited);
    return;
  }

  const session = await sessionStore.getSession(sessionKey);
  const { reply, sessionUpdates } = route(session, text);

  if (sessionUpdates.__deleteSession) {
    await sessionStore.deleteSession(sessionKey);
    try {
      const result = await deleteFoundingSupplierRecordByContact(channel, externalId);
      if (result.deleted > 0) {
        console.log(`Deleted ${result.deleted} Airtable record(s) for user-requested deletion (${channel}).`);
      }
    } catch (err) {
      console.error("Failed to delete Airtable record on user request:", err.message);
    }
    await sendFn(externalId, reply);
    return;
  }

  if (sessionUpdates.__needsAiAnswer) {
    const { __needsAiAnswer, __aiQuestion, ...cleanUpdates } = sessionUpdates;
    const question = __aiQuestion;
    const history = Array.isArray(session.aiConversationHistory) ? session.aiConversationHistory : [];

    let finalReply;
    let updatedHistory = history;

    try {
      const aiAnswer = await answerProcurementQuestion(question, history);
      if (aiAnswer) {
        finalReply = aiAnswer;
        updatedHistory = [...history, { role: "user", text: question }, { role: "model", text: aiAnswer }].slice(-20);
      } else {
        finalReply = messages.path2.placeholder;
        // Don't pollute history with a failed exchange.
      }
    } catch (err) {
      console.error("Unexpected error answering procurement question:", err.message);
      finalReply = messages.path2.placeholder;
    }

    cleanUpdates.aiConversationHistory = updatedHistory;

    await sessionStore.setSession(sessionKey, cleanUpdates);
    await sendFn(externalId, finalReply);
    return;
  }

  const { __interviewCompleted, ...cleanUpdates } = sessionUpdates;
  const updatedSession = await sessionStore.setSession(sessionKey, cleanUpdates);

  if (__interviewCompleted) {
    try {
      await createFoundingSupplierRecord(updatedSession, channel, externalId);
      console.log(`Founding Supplier record created in Airtable (${channel}).`);
    } catch (err) {
      console.error("Failed to persist completed interview to Airtable — needs manual follow-up:", err.message);
    }
  }

  await sendFn(externalId, reply);
}

module.exports = { processIncomingMessage };

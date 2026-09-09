const { route } = require("./router");
const messages = require("./messages");
const { checkRateLimit } = require("./rateLimiter");
const sessionStore = require("./sessionStore");
const { createFoundingSupplierRecord, deleteFoundingSupplierRecordByContact } = require("./airtable");
const { answerProcurementQuestion } = require("./answerProcurementQuestion");

/**
 * Channel-agnostic core of the funnel. Every channel webhook (WhatsApp,
 * Messenger, Instagram) calls this same function.
 *
 * NOTE: this copy lives in docs/api/_shared/ for the Vercel serverless
 * deployment — dependencies are flat siblings in this same folder,
 * unlike the original src/funnel/core.js where they lived in separate
 * db/ and ai/ subfolders. Use "./whatever" paths here, not "../db/..."
 * or "../ai/...".
 *
 * CHANGE: the "Would you like to join the Founding Supplier Programme?"
 * closing prompt now only appears after the FIRST AI-answered question
 * in a Path 2 conversation, not after every single answer. Without
 * this, a user asking several follow-up questions in a row would see
 * the same nudge repeated after each one, which reads as naggy rather
 * than helpful. We detect "first question" by checking whether
 * session.awaitingClosingReply was already true coming into this turn
 * — if so, they've already seen the nudge once and chose to ask
 * another question instead of answering 1/2, so we just answer
 * plainly this time.
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
        console.log(
          `Deleted ${result.deleted} Airtable record(s) for user-requested deletion (${channel}).`
        );
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
    const alreadyPromptedThisSession = session.awaitingClosingReply === true;

    let finalReply;
    try {
      const aiAnswer = await answerProcurementQuestion(question);
      const answerText = aiAnswer || messages.path2.placeholder;
      finalReply = alreadyPromptedThisSession
        ? answerText
        : answerText + "\n\n" + messages.path2.closingPrompt;
    } catch (err) {
      console.error("Unexpected error answering procurement question:", err.message);
      finalReply = alreadyPromptedThisSession
        ? messages.path2.placeholder
        : messages.path2.placeholder + "\n\n" + messages.path2.closingPrompt;
    }

    // Once shown, stays shown for the rest of this Path 2 conversation
    // — never nag again, but also never re-offer if they already saw it.
    cleanUpdates.awaitingClosingReply = true;

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
      console.error(
        "Failed to persist completed interview to Airtable — needs manual follow-up:",
        err.message
      );
    }
  }

  await sendFn(externalId, reply);
}

module.exports = { processIncomingMessage };

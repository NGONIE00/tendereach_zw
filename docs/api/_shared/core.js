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
 * deployment — all its dependencies (router.js, messages.js,
 * rateLimiter.js, sessionStore.js, airtable.js,
 * answerProcurementQuestion.js) are flat siblings in the same _shared
 * folder here, unlike the original src/funnel/core.js where they lived
 * in separate db/ and ai/ subfolders. If you edit this file, use
 * "./whatever" paths, not "../db/whatever" or "../ai/whatever" — that
 * mismatch is exactly what caused the FUNCTION_INVOCATION_FAILED crash.
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

    let finalReply;
    try {
      const aiAnswer = await answerProcurementQuestion(question);
      if (aiAnswer) {
        finalReply = aiAnswer + "\n\n" + messages.path2.closingPrompt;
      } else {
        finalReply = messages.path2.placeholder + "\n\n" + messages.path2.closingPrompt;
      }
      cleanUpdates.awaitingClosingReply = true;
    } catch (err) {
      console.error("Unexpected error answering procurement question:", err.message);
      finalReply = messages.path2.placeholder + "\n\n" + messages.path2.closingPrompt;
      cleanUpdates.awaitingClosingReply = true;
    }

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

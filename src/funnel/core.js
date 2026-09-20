const { route } = require("./router");
const messages = require("./messages");
const { checkRateLimit } = require("./rateLimiter");
const sessionStore = require("../db/sessionStore");
const { createFoundingSupplierRecord, deleteFoundingSupplierRecordByContact } = require("../db/airtable");
const { answerProcurementQuestion } = require("../ai/answerProcurementQuestion");

/**
 * Channel-agnostic core of the funnel. Every channel webhook (WhatsApp,
 * Messenger, Instagram) calls this same function.
 *
 * ⚠️ THIS FILE'S REQUIRE PATHS ARE DIFFERENT FROM THE OTHER COPY.
 *
 * This is src/funnel/core.js — here, sessionStore/airtable live in a
 * SIBLING "db/" folder and the AI module lives in a sibling "ai/"
 * folder, so the paths go up one level first: "../db/...", "../ai/...".
 *
 * The OTHER copy, docs/api/_shared/core.js, sits in a completely FLAT
 * folder where every one of these files is a direct sibling — so that
 * version correctly uses "./sessionStore", "./airtable",
 * "./answerProcurementQuestion" instead.
 *
 * router.js and messages.js ARE identical between both locations
 * (they only ever import from their own folder). core.js is the one
 * exception — never copy-paste this file's require lines into the
 * _shared/ version, or vice versa.
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

const { route } = require("./router");
const messages = require("./messages");
const { checkRateLimit } = require("./rateLimiter");
const sessionStore = require("../db/sessionStore");
const { createFoundingSupplierRecord, deleteFoundingSupplierRecordByContact } = require("../db/airtable");

/**
 * Channel-agnostic core of the funnel. Every channel webhook (WhatsApp,
 * Messenger, Instagram, and any future one) calls this same function —
 * only the inbound payload parsing and the outbound `sendFn` differ per
 * channel. This is what keeps docs/WHATSAPP_FUNNEL.md's logic identical
 * across platforms instead of forking into three copies that drift apart.
 *
 * Session keys are namespaced per channel (`whatsapp:<id>`,
 * `messenger:<id>`, `instagram:<id>`) so the same person messaging on two
 * different platforms is treated as two separate conversations for now —
 * see docs/MULTI_CHANNEL_ARCHITECTURE.md for why that's a deliberate
 * simplification, not an oversight.
 *
 * @param {string} channel - 'whatsapp' | 'messenger' | 'instagram'
 * @param {string} externalId - the platform's own user identifier
 *   (WhatsApp phone number, Messenger PSID, Instagram-scoped ID)
 * @param {string} text - the incoming message text
 * @param {(externalId: string, body: string) => Promise<void>} sendFn -
 *   channel-specific function that actually sends the reply
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
  } else {
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
  }

  await sendFn(externalId, reply);
}

module.exports = { processIncomingMessage };

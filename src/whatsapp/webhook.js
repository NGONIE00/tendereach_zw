require("dotenv").config();
const express = require("express");
const { route } = require("./router");
const { sendWhatsAppMessage } = require("./client");
const sessionStore = require("../db/sessionStore");
const { createFoundingSupplierRecord, deleteFoundingSupplierRecordByPhone } = require("../db/airtable");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * Webhook verification handshake — required once when you register the
 * webhook URL in the Meta App Dashboard.
 */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/**
 * Inbound message handler. Meta sends a POST here for every incoming
 * message, delivery status update, etc. — we only act on actual text
 * messages from users.
 */
app.post("/webhook", async (req, res) => {
  // Respond fast — Meta expects a 200 quickly regardless of processing time.
  res.sendStatus(200);

  try {
    const entry = req.body.entry && req.body.entry[0];
    const change = entry && entry.changes && entry.changes[0];
    const value = change && change.value;
    const message = value && value.messages && value.messages[0];

    if (!message || message.type !== "text") {
      return; // Ignore non-text messages, status updates, etc. for now.
    }

    const fromPhoneNumber = message.from;
    const text = message.text.body;

    await handleIncomingMessage(fromPhoneNumber, text);
  } catch (err) {
    console.error("Error handling incoming webhook payload:", err.message);
  }
});

async function handleIncomingMessage(fromPhoneNumber, text) {
  const session = sessionStore.getSession(fromPhoneNumber);
  const { reply, sessionUpdates } = route(session, text);

  if (sessionUpdates.__deleteSession) {
    sessionStore.deleteSession(fromPhoneNumber);
    // Also clear any Airtable record from a completed interview — the
    // deletion promise in docs/ETHICS.md covers both, not just session
    // memory. Errors are logged but don't block the confirmation reply.
    try {
      const result = await deleteFoundingSupplierRecordByPhone(fromPhoneNumber);
      if (result.deleted > 0) {
        console.log(`Deleted ${result.deleted} Airtable record(s) for user-requested deletion.`);
      }
    } catch (err) {
      console.error("Failed to delete Airtable record on user request:", err.message);
    }
  } else {
    // Strip internal-only signal flags before persisting to session store.
    const { __interviewCompleted, ...cleanUpdates } = sessionUpdates;
    sessionStore.setSession(fromPhoneNumber, cleanUpdates);

    if (__interviewCompleted) {
      // Persist to the Founding Suppliers Airtable table (docs/CRM_SCHEMA.md).
      // Wrapped so a persistence failure never blocks the WhatsApp reply
      // already queued below — the user still gets their completion
      // message even if the CRM write needs manual retry.
      try {
        const updatedSession = sessionStore.getSession(fromPhoneNumber);
        await createFoundingSupplierRecord(updatedSession);
        console.log("Founding Supplier record created in Airtable.");
      } catch (err) {
        console.error(
          "Failed to persist completed interview to Airtable — needs manual follow-up:",
          err.message
        );
      }
    }
  }

  await sendWhatsAppMessage(fromPhoneNumber, reply);
}

// Periodically purge expired sessions per the retention window in
// docs/ETHICS.md. Every hour is reasonable for an early-stage deployment.
setInterval(() => sessionStore.purgeExpiredSessions(), 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`TenderReach WhatsApp webhook listening on port ${PORT}`);
});

module.exports = app;

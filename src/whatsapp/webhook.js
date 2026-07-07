require("dotenv").config();
const express = require("express");
const { route } = require("./router");
const { sendWhatsAppMessage } = require("./client");
const sessionStore = require("../db/sessionStore");

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
  } else {
    // Strip internal-only signal flags before persisting to session store.
    const { __interviewCompleted, ...cleanUpdates } = sessionUpdates;
    sessionStore.setSession(fromPhoneNumber, cleanUpdates);

    if (__interviewCompleted) {
      // TODO: persist session.interviewAnswers into the Founding Suppliers
      // Airtable/Supabase record here — see docs/CRM_SCHEMA.md. Not yet
      // wired up; this is where that integration will plug in.
      console.log(`Interview completed for a user — ready to persist to CRM.`);
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

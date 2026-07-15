const express = require("express");
const { processIncomingMessage } = require("../funnel/core");
const messages = require("../funnel/messages");
const { sendWhatsAppMessage } = require("./client");

const router = express.Router();
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * Webhook verification handshake — required once when you register the
 * webhook URL in the Meta App Dashboard. Registered callback URL stays
 * exactly "/webhook" (mounted at the app root by server.js) so existing
 * Meta configuration doesn't need to change when other channels are added.
 */
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[whatsapp] Webhook verified successfully.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/**
 * Inbound message handler. Meta sends a POST here for every incoming
 * message, delivery status update, etc. — we only act on actual text
 * messages from users; other message types get a graceful reply instead
 * of being silently dropped. All funnel logic (routing, session,
 * Airtable persistence, rate limiting) lives in ../funnel/core.js and is
 * shared across every channel — this file only handles the
 * WhatsApp-specific payload shape and sending.
 */
router.post("/", async (req, res) => {
  // Respond fast — Meta expects a 200 quickly regardless of processing time.
  res.sendStatus(200);

  try {
    const entry = req.body.entry && req.body.entry[0];
    const change = entry && entry.changes && entry.changes[0];
    const value = change && change.value;
    const message = value && value.messages && value.messages[0];

    if (!message) {
      return; // Status updates, read receipts, etc. — nothing to reply to.
    }

    const fromPhoneNumber = message.from;

    if (message.type !== "text") {
      await sendWhatsAppMessage(fromPhoneNumber, messages.unsupportedMessageType);
      return;
    }

    const text = message.text.body;
    await processIncomingMessage("whatsapp", fromPhoneNumber, text, sendWhatsAppMessage);
  } catch (err) {
    console.error("[whatsapp] Error handling incoming webhook payload:", err.message);
  }
});

module.exports = router;

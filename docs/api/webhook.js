const { processIncomingMessage } = require("./_shared/core");
const messages = require("./_shared/messages");
const { sendWhatsAppMessage, sendTypingIndicator } = require("./_shared/whatsappClient");

/**
 * Vercel serverless function for the WhatsApp webhook (/api/webhook).
 *
 * Shows a typing indicator immediately on receiving a text message,
 * before the (potentially slow, 1-3+ second) Gemini/Airtable work in
 * processIncomingMessage — see whatsappClient.js's sendTypingIndicator
 * for why this matters given serverless awaits the full response
 * before replying.
 */
module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("[whatsapp] Webhook verified successfully.");
      res.status(200).send(challenge);
      return;
    }
    res.status(403).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  try {
    const entry = req.body.entry && req.body.entry[0];
    const change = entry && entry.changes && entry.changes[0];
    const value = change && change.value;
    const message = value && value.messages && value.messages[0];

    if (!message) {
      res.status(200).end();
      return;
    }

    const fromPhoneNumber = message.from;

    if (message.type !== "text") {
      await sendWhatsAppMessage(fromPhoneNumber, messages.unsupportedMessageType);
      res.status(200).end();
      return;
    }

    // Fire the typing indicator without blocking on it — best-effort,
    // never delays the actual processing below.
    sendTypingIndicator(message.id);

    const text = message.text.body;
    await processIncomingMessage("whatsapp", fromPhoneNumber, text, sendWhatsAppMessage);
    res.status(200).end();
  } catch (err) {
    console.error("[whatsapp] Error handling incoming webhook payload:", err.message);
    res.status(200).end();
  }
};

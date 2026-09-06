const { processIncomingMessage } = require("./_shared/core");
const messages = require("./_shared/messages");
const { sendWhatsAppMessage } = require("./_shared/whatsappClient");

/**
 * Vercel serverless function replacing the old Express route at
 * src/whatsapp/webhookRoutes.js (mounted at /webhook there; this one
 * lives at /api/webhook — update Meta's Callback URL to match).
 *
 * IMPORTANT DIFFERENCE FROM THE OLD SERVER: this function awaits the
 * full processIncomingMessage() call (including any Gemini/Airtable/
 * Supabase work) BEFORE responding to Meta. The old Express server
 * could ack with 200 immediately and keep working in the background
 * because it was a long-running process; a serverless function may be
 * frozen the instant it returns, so background work can't be relied on
 * here. This adds a small delay (typically 1-3 seconds) to the webhook
 * response, which is within what Meta tolerates.
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
      res.status(200).end(); // status updates, read receipts — nothing to do
      return;
    }

    const fromPhoneNumber = message.from;

    if (message.type !== "text") {
      await sendWhatsAppMessage(fromPhoneNumber, messages.unsupportedMessageType);
      res.status(200).end();
      return;
    }

    const text = message.text.body;
    await processIncomingMessage("whatsapp", fromPhoneNumber, text, sendWhatsAppMessage);
    res.status(200).end();
  } catch (err) {
    console.error("[whatsapp] Error handling incoming webhook payload:", err.message);
    // Still ack 200 — Meta will retry aggressively on non-200, which
    // isn't helpful here since the error already happened.
    res.status(200).end();
  }
};

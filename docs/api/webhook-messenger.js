const { processIncomingMessage } = require("./_shared/core");
const { sendMessengerMessage } = require("./_shared/messengerClient");

/**
 * Vercel serverless function replacing src/messenger/webhookRoutes.js.
 * Update Meta's Messenger Callback URL to /api/webhook-messenger on
 * your Vercel domain. See docs/api/webhook.js for the note on why this
 * awaits full processing before responding (serverless vs. long-running
 * server behavior).
 */
module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.MESSENGER_VERIFY_TOKEN) {
      console.log("[messenger] Webhook verified successfully.");
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
    if (req.body.object !== "page") {
      res.status(200).end();
      return;
    }

    const entries = req.body.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        const senderPsid = event.sender && event.sender.id;
        const text = event.message && event.message.text;
        if (!senderPsid || !text) continue;
        await processIncomingMessage("messenger", senderPsid, text, sendMessengerMessage);
      }
    }

    res.status(200).end();
  } catch (err) {
    console.error("[messenger] Error handling incoming webhook payload:", err.message);
    res.status(200).end();
  }
};

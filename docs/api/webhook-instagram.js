const { processIncomingMessage } = require("./_shared/core");
const { sendInstagramMessage } = require("./_shared/instagramClient");

/**
 * Vercel serverless function replacing src/instagram/webhookRoutes.js.
 * Update Meta's Instagram Callback URL to /api/webhook-instagram on
 * your Vercel domain. See docs/api/webhook.js for the note on why this
 * awaits full processing before responding.
 */
module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      console.log("[instagram] Webhook verified successfully.");
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
    if (req.body.object !== "instagram") {
      res.status(200).end();
      return;
    }

    const entries = req.body.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        const senderId = event.sender && event.sender.id;
        const text = event.message && event.message.text;
        if (!senderId || !text) continue;
        await processIncomingMessage("instagram", senderId, text, sendInstagramMessage);
      }
    }

    res.status(200).end();
  } catch (err) {
    console.error("[instagram] Error handling incoming webhook payload:", err.message);
    res.status(200).end();
  }
};

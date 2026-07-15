const express = require("express");
const { processIncomingMessage } = require("../funnel/core");
const { sendMessengerMessage } = require("./client");

const router = express.Router();
const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;

/**
 * Mounted at /webhook/messenger by server.js. Register this full path
 * (e.g. https://your-domain/webhook/messenger) as the Messenger webhook
 * callback URL in the Meta App Dashboard, separate from the WhatsApp one.
 *
 * Setup still needed before this goes live (not yet done as of this
 * commit — see docs/MULTI_CHANNEL_ARCHITECTURE.md):
 *   1. A Facebook Page for TenderReach, connected to the Meta App.
 *   2. Messenger product added to the app, Page linked, Page Access
 *      Token generated -> MESSENGER_PAGE_ACCESS_TOKEN in .env.
 *   3. MESSENGER_VERIFY_TOKEN set to any string you choose (same pattern
 *      as WHATSAPP_VERIFY_TOKEN), matched in the Meta webhook config.
 *   4. Subscribe the webhook to the "messages" field for the Page.
 */
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[messenger] Webhook verified successfully.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post("/", async (req, res) => {
  res.sendStatus(200); // Meta expects a fast 200 regardless of processing time.

  try {
    if (req.body.object !== "page") return;

    const entries = req.body.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        const senderPsid = event.sender && event.sender.id;
        const text = event.message && event.message.text;

        if (!senderPsid || !text) continue; // e.g. delivery receipts, attachments-only messages

        await processIncomingMessage("messenger", senderPsid, text, sendMessengerMessage);
      }
    }
  } catch (err) {
    console.error("[messenger] Error handling incoming webhook payload:", err.message);
  }
});

module.exports = router;

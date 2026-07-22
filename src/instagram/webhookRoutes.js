const express = require("express");
const { processIncomingMessage } = require("../funnel/core");
const { sendInstagramMessage } = require("./client");

const router = express.Router();
const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;

/**
 * Mounted at /webhook/instagram by server.js. Register this full path
 * as the Instagram webhook callback URL in the Meta App Dashboard.
 *
 * Setup still needed before this goes live (not yet done as of this
 * commit — see docs/MULTI_CHANNEL_ARCHITECTURE.md):
 *   1. An Instagram professional (Business/Creator) account, connected
 *      to the same Facebook Page used for Messenger.
 *   2. Instagram product added to the app, permissions granted, Page
 *      Access Token generated -> INSTAGRAM_PAGE_ACCESS_TOKEN in .env
 *      (same token type as Messenger's, since both go through the Page).
 *   3. INSTAGRAM_VERIFY_TOKEN set to any string you choose, matched in
 *      the Meta webhook config.
 *   4. Subscribe the webhook to the "messages" field for Instagram.
 */
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[instagram] Webhook verified successfully.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post("/", async (req, res) => {
  res.sendStatus(200); // Meta expects a fast 200 regardless of processing time.

  // TEMPORARY DEBUG LOGGING — remove once the real payload shape is
  // confirmed and parsing below is adjusted to match it.
  console.log("[instagram] RAW PAYLOAD:", JSON.stringify(req.body, null, 2));

  try {
    if (req.body.object !== "instagram") return;

    const entries = req.body.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        const senderId = event.sender && event.sender.id;
        const text = event.message && event.message.text;

        if (!senderId || !text) continue; // e.g. story replies, reactions, attachments-only

        await processIncomingMessage("instagram", senderId, text, sendInstagramMessage);
      }
    }
  } catch (err) {
    console.error("[instagram] Error handling incoming webhook payload:", err.message);
  }
});

module.exports = router;

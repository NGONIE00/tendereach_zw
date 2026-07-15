require("dotenv").config();
const express = require("express");
const sessionStore = require("./db/sessionStore");

const whatsappWebhookRoutes = require("./whatsapp/webhookRoutes");
const messengerWebhookRoutes = require("./messenger/webhookRoutes");
const instagramWebhookRoutes = require("./instagram/webhookRoutes");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// WhatsApp stays mounted at the app root "/webhook" (not "/webhook/whatsapp")
// to match the callback URL already registered in Meta's dashboard —
// changing it would mean re-verifying the webhook there for no benefit.
app.use("/webhook", whatsappWebhookRoutes);

// Messenger and Instagram are new integrations, so they get their own
// clearly-named paths from the start — see docs/MULTI_CHANNEL_ARCHITECTURE.md.
app.use("/webhook/messenger", messengerWebhookRoutes);
app.use("/webhook/instagram", instagramWebhookRoutes);

// Periodically purge expired sessions per the retention window in
// docs/ETHICS.md. Shared across all channels since they use the same
// session store. Every hour is reasonable for an early-stage deployment.
setInterval(() => {
  sessionStore.purgeExpiredSessions().catch((err) =>
    console.error("purgeExpiredSessions failed:", err.message)
  );
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`TenderReach server listening on port ${PORT}`);
  console.log(`  WhatsApp webhook:  /webhook`);
  console.log(`  Messenger webhook: /webhook/messenger`);
  console.log(`  Instagram webhook: /webhook/instagram`);
});

module.exports = app;

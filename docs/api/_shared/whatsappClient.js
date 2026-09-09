const axios = require("axios");

const GRAPH_API_VERSION = "v19.0";

/**
 * Sends a plain text WhatsApp message via the Meta Cloud API.
 * Requires WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env
 * (or Vercel Environment Variables, for the serverless deployment).
 */
async function sendWhatsAppMessage(toPhoneNumber, bodyText) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!phoneNumberId || !token) {
    throw new Error(
      "Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_API_TOKEN — check your .env file."
    );
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: toPhoneNumber,
        type: "text",
        text: { body: bodyText },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error(
      "Failed to send WhatsApp message:",
      err.response ? err.response.data : err.message
    );
    throw err;
  }
}

/**
 * Marks an incoming message as read AND shows the "typing…" indicator
 * to the sender for up to 25 seconds (or until the next message is
 * sent, whichever comes first). Call this as soon as a message comes
 * in, before any slow processing (e.g. the Gemini call) — gives the
 * user visible feedback that something's happening during the wait,
 * which matters now that serverless awaits the full response before
 * replying (see docs/api/webhook.js).
 *
 * Best-effort: failures here are logged but never thrown, since a
 * missing typing indicator should never block the actual reply.
 */
async function sendTypingIndicator(incomingMessageId) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!phoneNumberId || !token || !incomingMessageId) return;

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: incomingMessageId,
        typing_indicator: { type: "text" },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error(
      "Failed to send typing indicator (non-fatal, continuing):",
      err.response ? err.response.data : err.message
    );
  }
}

module.exports = { sendWhatsAppMessage, sendTypingIndicator };

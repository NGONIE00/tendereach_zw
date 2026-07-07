const axios = require("axios");

const GRAPH_API_VERSION = "v19.0";

/**
 * Sends a plain text WhatsApp message via the Meta Cloud API.
 * Requires WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env.
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
    // Never log the full message body or phone number in plaintext at error
    // level in production — see SECURITY.md on avoiding plaintext phone
    // number logging. Logging minimal diagnostic info only here.
    console.error(
      "Failed to send WhatsApp message:",
      err.response ? err.response.data : err.message
    );
    throw err;
  }
}

module.exports = { sendWhatsAppMessage };

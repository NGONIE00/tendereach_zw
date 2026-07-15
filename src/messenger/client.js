const axios = require("axios");

const GRAPH_API_VERSION = "v19.0";

/**
 * Sends a plain text message via the Messenger Send API. Requires a Page
 * Access Token (from the Facebook Page connected to your app), not the
 * WhatsApp token — these are separate credentials even though both go
 * through the Graph API.
 */
async function sendMessengerMessage(recipientPsid, bodyText) {
  const pageAccessToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN;

  if (!pageAccessToken) {
    throw new Error("Missing MESSENGER_PAGE_ACCESS_TOKEN — check your .env file.");
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`;

  try {
    await axios.post(
      url,
      {
        recipient: { id: recipientPsid },
        message: { text: bodyText },
        messaging_type: "RESPONSE",
      },
      {
        params: { access_token: pageAccessToken },
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(
      "[messenger] Failed to send message:",
      err.response ? err.response.data : err.message
    );
    throw err;
  }
}

module.exports = { sendMessengerMessage };

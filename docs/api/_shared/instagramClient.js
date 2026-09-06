const axios = require("axios");

const GRAPH_API_VERSION = "v19.0";

/**
 * Sends a plain text message via the Instagram Messaging API. This uses
 * the same Graph API /me/messages endpoint as Messenger, authenticated
 * with the Page Access Token of the Facebook Page linked to the
 * Instagram professional account — NOT a separate Instagram-only token.
 */
async function sendInstagramMessage(recipientIgsid, bodyText) {
  const pageAccessToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;

  if (!pageAccessToken) {
    throw new Error("Missing INSTAGRAM_PAGE_ACCESS_TOKEN — check your .env file.");
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`;

  try {
    await axios.post(
      url,
      {
        recipient: { id: recipientIgsid },
        message: { text: bodyText },
      },
      {
        params: { access_token: pageAccessToken },
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(
      "[instagram] Failed to send message:",
      err.response ? err.response.data : err.message
    );
    throw err;
  }
}

module.exports = { sendInstagramMessage };

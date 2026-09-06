const Airtable = require("airtable");

/**
 * Writes a completed Founding Supplier interview into the Founding
 * Suppliers Airtable table — see docs/CRM_SCHEMA.md for the full field
 * reference. Works for any channel (WhatsApp, Messenger, Instagram).
 *
 * Field mapping notes:
 * - Q1 (name + company) arrives as one free-text answer. We store it
 *   raw in Contact Name and leave Company Name blank; a human splits
 *   these on review until the AI layer (src/ai/) can parse it reliably.
 * - Consent Given is always set true here, since reaching this function
 *   means the user completed the full interview after the consent line
 *   in messages.path1.intro (see docs/ETHICS.md).
 * - "Contact ID" is `${channel}:${externalId}` — the stable lookup key
 *   used for deletion requests regardless of channel. "Phone" is only
 *   populated when channel === 'whatsapp', since Messenger/Instagram IDs
 *   aren't phone numbers — see docs/MULTI_CHANNEL_ARCHITECTURE.md.
 */
async function createFoundingSupplierRecord(session, channel, externalId) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_FOUNDING_SUPPLIERS_TABLE || "Founding Suppliers";

  if (!apiKey || !baseId) {
    throw new Error(
      "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID — check your .env file. Interview data was not persisted."
    );
  }

  const base = new Airtable({ apiKey }).base(baseId);
  const [q1NameCompany, q2Products, q3GovSupplier, q4Discovery, q5Hardest, q6Deadline, q7TopProblem] =
    session.interviewAnswers;

  const fields = {
    "Contact Name": q1NameCompany || "",
    "Products/Services Offered": q2Products || "",
    "Government Supplier Status": normalizeYesNo(q3GovSupplier),
    "How They Discover Tenders": q4Discovery || "",
    "Hardest Part of Applying": q5Hardest || "",
    "Deadline Experience": q6Deadline || "",
    "Top Problem to Solve": q7TopProblem || "",
    "Channel": capitalize(channel),
    "Contact ID": `${channel}:${externalId}`,
    "Phone": channel === "whatsapp" ? externalId : "",
    "Consent Given": true,
    "Interview Status": "Completed",
    "Internal Tag": session.internalTag || "Pilot User",
  };

  return new Promise((resolve, reject) => {
    base(tableName).create([{ fields }], (err, records) => {
      if (err) {
        console.error("Airtable write failed:", err.message);
        return reject(err);
      }
      resolve(records);
    });
  });
}

function capitalize(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Best-effort normalization of the free-text Yes/No/Occasionally answer
 * (Q3) into one of Airtable's exact single-select option strings. Falls
 * back to leaving the raw text if it doesn't clearly match, rather than
 * silently guessing wrong — a human can clean this up on review.
 */
function normalizeYesNo(rawAnswer) {
  if (!rawAnswer) return "";
  const text = rawAnswer.trim().toLowerCase();
  if (text.startsWith("y")) return "Yes";
  if (text.startsWith("n")) return "No";
  if (text.startsWith("occ")) return "Occasionally";
  return rawAnswer; // leave as-is for manual review rather than misclassify
}

/**
 * Finds and deletes any Founding Supplier record matching a channel +
 * external ID pair. Used when a user replies "delete my data" — see
 * docs/ETHICS.md, which promises deletion on request, not just session
 * clearing. Silently does nothing if no matching record exists (e.g.
 * they never completed the interview) rather than erroring.
 */
async function deleteFoundingSupplierRecordByContact(channel, externalId) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_FOUNDING_SUPPLIERS_TABLE || "Founding Suppliers";

  if (!apiKey || !baseId) {
    throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID — cannot process deletion.");
  }

  const base = new Airtable({ apiKey }).base(baseId);
  const contactId = `${channel}:${externalId}`;

  return new Promise((resolve, reject) => {
    base(tableName)
      .select({ filterByFormula: `{Contact ID} = "${contactId}"` })
      .firstPage((err, records) => {
        if (err) return reject(err);
        if (!records || records.length === 0) return resolve({ deleted: 0 });

        const idsToDelete = records.map((r) => r.id);
        base(tableName).destroy(idsToDelete, (destroyErr, deleted) => {
          if (destroyErr) return reject(destroyErr);
          resolve({ deleted: deleted.length });
        });
      });
  });
}

module.exports = { createFoundingSupplierRecord, deleteFoundingSupplierRecordByContact };

// Exposed only for unit testing internal helpers — not part of the public
// module API. See src/db/airtable.test.js.
module.exports.__test__ = { normalizeYesNo, capitalize };

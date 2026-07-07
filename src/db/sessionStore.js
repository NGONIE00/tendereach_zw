/**
 * Session store for tracking each phone number's position in the WhatsApp
 * funnel (docs/WHATSAPP_FUNNEL.md).
 *
 * This is an in-memory implementation for local development and early
 * testing. It is NOT persistent across server restarts and is NOT suitable
 * for production — swap this out for a Supabase-backed implementation
 * (see src/db/README.md) before going live with real users, since retention
 * and deletion guarantees in docs/ETHICS.md need a real, auditable store.
 *
 * The interface (get/set/delete) is deliberately small so the swap is a
 * drop-in replacement — router.js should never need to change.
 */

const sessions = new Map();

// Retention window matches TENDER_CONTENT_RETENTION_DAYS in .env.example.
// Sessions older than this are treated as expired even if not explicitly deleted.
const RETENTION_DAYS = parseInt(process.env.TENDER_CONTENT_RETENTION_DAYS || "30", 10);
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function isExpired(session) {
  return Date.now() - session.lastActive > RETENTION_MS;
}

/**
 * Get a user's session. Returns a fresh default session if none exists
 * or if the existing one has expired past the retention window.
 */
function getSession(phoneNumber) {
  const existing = sessions.get(phoneNumber);
  if (!existing || isExpired(existing)) {
    const fresh = {
      phoneNumber,
      currentPath: null, // null | 'path1' | 'path2' | 'path3' | 'path4'
      interviewStep: 0, // index into path1.questions, 0 = not started
      interviewAnswers: [], // collected answers, only populated after consent
      internalTag: "Cold Lead",
      createdAt: Date.now(),
      lastActive: Date.now(),
    };
    sessions.set(phoneNumber, fresh);
    return fresh;
  }
  return existing;
}

function setSession(phoneNumber, updates) {
  const current = getSession(phoneNumber);
  const updated = { ...current, ...updates, lastActive: Date.now() };
  sessions.set(phoneNumber, updated);
  return updated;
}

/**
 * Full deletion — used when a user replies "delete my data" per
 * docs/ETHICS.md. Removes the session entirely, not just marks it inactive.
 */
function deleteSession(phoneNumber) {
  sessions.delete(phoneNumber);
}

/** Periodic cleanup of expired sessions — call on an interval in production. */
function purgeExpiredSessions() {
  for (const [phoneNumber, session] of sessions.entries()) {
    if (isExpired(session)) {
      sessions.delete(phoneNumber);
    }
  }
}

module.exports = { getSession, setSession, deleteSession, purgeExpiredSessions };

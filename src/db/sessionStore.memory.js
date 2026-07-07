/**
 * IN-MEMORY session store — dev/local-testing fallback only.
 *
 * Used automatically when Supabase env vars are not set (see
 * src/db/sessionStore.js, the switcher that picks this or the Supabase
 * implementation). Not persistent across server restarts and not
 * suitable for production — see src/db/sessionStore.supabase.js for the
 * real implementation.
 *
 * The interface (getSession/setSession/deleteSession/purgeExpiredSessions)
 * is deliberately identical across both implementations so router.js and
 * webhook.js never need to know or care which one is active.
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
async function getSession(phoneNumber) {
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

async function setSession(phoneNumber, updates) {
  const current = await getSession(phoneNumber);
  const updated = { ...current, ...updates, lastActive: Date.now() };
  sessions.set(phoneNumber, updated);
  return updated;
}

/**
 * Full deletion — used when a user replies "delete my data" per
 * docs/ETHICS.md. Removes the session entirely, not just marks it inactive.
 */
async function deleteSession(phoneNumber) {
  sessions.delete(phoneNumber);
}

/** Periodic cleanup of expired sessions — call on an interval in production. */
async function purgeExpiredSessions() {
  for (const [phoneNumber, session] of sessions.entries()) {
    if (isExpired(session)) {
      sessions.delete(phoneNumber);
    }
  }
}

module.exports = { getSession, setSession, deleteSession, purgeExpiredSessions };

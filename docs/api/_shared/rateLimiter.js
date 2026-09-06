/**
 * Simple sliding-window rate limiter, per phone number, to prevent abuse
 * of the messaging/AI pipeline — see SECURITY.md, "Rate limiting on
 * inbound messages."
 *
 * In-memory by design: rate limiting is a cost/abuse-control concern, not
 * a correctness or retention concern, so it doesn't need the same
 * durability guarantees as sessionStore — a restart simply resets limits,
 * which is an acceptable trade-off here.
 */

const MAX_MESSAGES = parseInt(process.env.RATE_LIMIT_MAX_MESSAGES || "20", 10);
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(10 * 60 * 1000), 10); // 10 min default

const hits = new Map(); // phoneNumber -> array of timestamps

/**
 * Returns { allowed: boolean, retryAfterMs?: number }.
 * Records the current attempt as a hit regardless of outcome, so repeated
 * over-limit attempts don't reset the window.
 */
function checkRateLimit(phoneNumber) {
  const now = Date.now();
  const existing = (hits.get(phoneNumber) || []).filter((t) => now - t < WINDOW_MS);

  if (existing.length >= MAX_MESSAGES) {
    const oldestInWindow = existing[0];
    const retryAfterMs = WINDOW_MS - (now - oldestInWindow);
    hits.set(phoneNumber, existing); // don't add this attempt; still over limit
    return { allowed: false, retryAfterMs };
  }

  existing.push(now);
  hits.set(phoneNumber, existing);
  return { allowed: true };
}

/** Test/ops helper — clears all rate limit state. */
function resetAll() {
  hits.clear();
}

module.exports = { checkRateLimit, resetAll };

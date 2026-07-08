/**
 * Picks the session store implementation based on environment config.
 *
 * - If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, uses the real
 *   Supabase-backed store (sessionStore.supabase.js) — required for
 *   production, since it's the only implementation that actually honors
 *   the retention/deletion guarantees in docs/ETHICS.md across restarts.
 * - Otherwise falls back to the in-memory store (sessionStore.memory.js)
 *   for local development without needing a Supabase project set up.
 *
 * Both implementations expose the same async interface
 * (getSession/setSession/deleteSession/purgeExpiredSessions), so callers
 * (router.js, webhook.js) never need to know which one is active.
 *
 * NOTE: the memory implementation's functions are synchronous under the
 * hood but are safe to `await` regardless (awaiting a non-promise value
 * just resolves immediately) — this keeps webhook.js's calling code
 * identical no matter which backend is selected.
 */

const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!useSupabase) {
  console.warn(
    "[sessionStore] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — using in-memory session store. " +
      "This is fine for local development but must NOT be used in production (see docs/ETHICS.md retention/deletion promises)."
  );
}

module.exports = useSupabase
  ? require("./sessionStore.supabase")
  : require("./sessionStore.memory");

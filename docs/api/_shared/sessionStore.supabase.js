/**
 * SUPABASE session store — the production implementation.
 *
 * Backs onto the `whatsapp_sessions` table (see
 * supabase/migrations/001_whatsapp_sessions.sql). Automatically selected
 * by src/db/sessionStore.js when SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are set in the environment.
 *
 * Interface matches src/db/sessionStore.memory.js exactly — see that
 * file's header for why that matters.
 */

const { createClient } = require("@supabase/supabase-js");

let _client = null;
function client() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check your .env file."
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}

const RETENTION_DAYS = parseInt(process.env.TENDER_CONTENT_RETENTION_DAYS || "30", 10);
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function rowToSession(row) {
  return {
    phoneNumber: row.phone_number,
    currentPath: row.current_path,
    interviewStep: row.interview_step,
    interviewAnswers: row.interview_answers || [],
    internalTag: row.internal_tag,
    createdAt: new Date(row.created_at).getTime(),
    lastActive: new Date(row.last_active).getTime(),
  };
}

function defaultSession(phoneNumber) {
  return {
    phoneNumber,
    currentPath: null,
    interviewStep: 0,
    interviewAnswers: [],
    internalTag: "Cold Lead",
    createdAt: Date.now(),
    lastActive: Date.now(),
  };
}

function isExpired(session) {
  return Date.now() - session.lastActive > RETENTION_MS;
}

async function getSession(phoneNumber) {
  const { data, error } = await client()
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (error) {
    console.error("Supabase getSession error:", error.message);
    throw error;
  }

  if (!data) {
    return defaultSession(phoneNumber);
  }

  const session = rowToSession(data);
  if (isExpired(session)) {
    await deleteSession(phoneNumber);
    return defaultSession(phoneNumber);
  }
  return session;
}

async function setSession(phoneNumber, updates) {
  const current = await getSession(phoneNumber);
  const updated = { ...current, ...updates, lastActive: Date.now() };

  const row = {
    phone_number: phoneNumber,
    current_path: updated.currentPath,
    interview_step: updated.interviewStep,
    interview_answers: updated.interviewAnswers,
    internal_tag: updated.internalTag,
    last_active: new Date(updated.lastActive).toISOString(),
  };

  const { error } = await client().from("whatsapp_sessions").upsert(row, {
    onConflict: "phone_number",
  });

  if (error) {
    console.error("Supabase setSession error:", error.message);
    throw error;
  }

  return updated;
}

async function deleteSession(phoneNumber) {
  const { error } = await client()
    .from("whatsapp_sessions")
    .delete()
    .eq("phone_number", phoneNumber);

  if (error) {
    console.error("Supabase deleteSession error:", error.message);
    throw error;
  }
}

async function purgeExpiredSessions() {
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  const { error } = await client()
    .from("whatsapp_sessions")
    .delete()
    .lt("last_active", cutoff);

  if (error) {
    console.error("Supabase purgeExpiredSessions error:", error.message);
    throw error;
  }
}

module.exports = { getSession, setSession, deleteSession, purgeExpiredSessions };

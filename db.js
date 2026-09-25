// Supabase via its REST API (no SDK needed). Every function is a no-op if Supabase isn't configured.
import { config, dbEnabled } from "./config.js";

function headers(extra = {}) {
  const h = { apikey: config.supabaseKey, "Content-Type": "application/json", ...extra };
  // Legacy service_role keys are JWTs and also go in Authorization. New sb_secret_ keys go only in apikey.
  if (config.supabaseKey.startsWith("eyJ")) h.Authorization = `Bearer ${config.supabaseKey}`;
  return h;
}

async function rest(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: headers(prefer ? { Prefer: prefer } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path.split("?")[0]} failed (${res.status}): ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// Returns the new note, or null if this Telegram message was already processed (Telegram retries).
export async function insertNote(note) {
  if (!dbEnabled()) return { id: null };
  const rows = await rest("notes?on_conflict=chat_id,telegram_message_id", {
    method: "POST",
    body: note,
    prefer: "return=representation,resolution=ignore-duplicates",
  });
  return rows && rows[0] ? rows[0] : null;
}

export async function updateNote(id, patch) {
  if (!dbEnabled() || !id) return;
  await rest(`notes?id=eq.${id}`, { method: "PATCH", body: patch });
}

export async function insertDraft(draft) {
  if (!dbEnabled()) return { id: null };
  const rows = await rest("drafts", { method: "POST", body: draft, prefer: "return=representation" });
  return rows[0];
}

export async function findDraft(chatId, replyToMessageId) {
  if (!dbEnabled()) return null;
  const base = `drafts?chat_id=eq.${encodeURIComponent(chatId)}`;
  if (replyToMessageId) {
    const rows = await rest(`${base}&telegram_message_id=eq.${replyToMessageId}&limit=1`);
    if (rows.length) return rows[0];
  }
  const rows = await rest(`${base}&status=eq.pending&order=created_at.desc&limit=1`);
  return rows[0] || null;
}

export async function decideDraft(id, status, decisionNote) {
  await rest(`drafts?id=eq.${id}`, {
    method: "PATCH",
    body: { status, decision_note: decisionNote || null, decided_at: new Date().toISOString() },
  });
}

export async function getVoice(name) {
  if (!dbEnabled()) return null;
  const rows = await rest(`voice_skill?name=eq.${encodeURIComponent(name)}&select=content&limit=1`);
  return rows[0]?.content || null;
}

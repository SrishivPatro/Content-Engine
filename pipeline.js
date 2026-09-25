import { config, dbEnabled } from "./config.js";
import { sendMessage } from "./telegram.js";
import { gemini, claude } from "./llm.js";
import { fetchNews } from "./news.js";
import * as db from "./db.js";
import { VOICES } from "./voices.js";
import { SCORE_SYSTEM, KEYWORD_SYSTEM, draftSystem, draftPrompt, verifyBlock } from "./prompts.js";

const HELP = `Send me any note. I'll:
1. Score it 0-10 (below ${config.minScore} = no draft, with the reason)
2. Find a relevant news angle
3. Draft a LinkedIn post in your voice

Then reply to the draft with APPROVE or REJECT (you can add a reason after it).
Nothing is ever posted for you — you publish it yourself.

COMPARE: <note> — drafts the same note with Gemini and Claude side by side.`;

async function loadVoice() {
  const name = config.voiceProfile;
  try {
    const fromDb = await db.getVoice(name);
    if (fromDb) return fromDb;
  } catch (e) {
    console.error("voice from db failed:", e.message);
  }
  return VOICES[name] || VOICES.srishiv;
}

async function score(note) {
  const r = await gemini({ system: SCORE_SYSTEM, prompt: `NOTE:\n${note}`, json: true });
  const s = Math.max(0, Math.min(10, Math.round(Number(r.score) || 0)));
  return { score: s, reason: String(r.reason || "").slice(0, 200) };
}

async function findNews(note) {
  try {
    const k = await gemini({ system: KEYWORD_SYSTEM, prompt: `NOTE:\n${note}`, json: true });
    const query = k.query || (k.keywords || []).slice(0, 4).join(" ");
    return { query, news: await fetchNews(query) };
  } catch (e) {
    console.error("news step failed:", e.message);
    return { query: null, news: null };
  }
}

async function draft(provider, voice, note, news) {
  const args = { system: draftSystem(voice), prompt: draftPrompt(note, news), json: true };
  const r = provider === "claude" ? await claude(args) : await gemini(args);
  const usedNews = Boolean(r.used_news && news);
  const text = String(r.draft || "").trim() + (usedNews ? verifyBlock(news) : "");
  return { text, usedNews, model: provider === "claude" ? config.claudeModel : config.geminiModel };
}

async function sendAndStoreDraft({ chatId, noteId, provider, result, news, label }) {
  const footer = dbEnabled()
    ? "\n\nReply to this message with APPROVE or REJECT."
    : "\n\n(Memory isn't set up yet, so APPROVE/REJECT won't be saved.)";
  const header = `📝 DRAFT${label ? ` — ${label}` : ""}\n\n`;
  const msg = await sendMessage(chatId, header + result.text + footer);
  await db.insertDraft({
    note_id: noteId,
    chat_id: chatId,
    telegram_message_id: msg.message_id,
    provider,
    model: result.model,
    content: result.text,
    used_news: result.usedNews,
    news_headline: result.usedNews ? news.headline : null,
    news_source: result.usedNews ? news.source : null,
    news_date: result.usedNews ? news.date : null,
    news_url: result.usedNews ? news.url : null,
    status: "pending",
  });
}

async function processNote(chatId, messageId, note, { compare = false } = {}) {
  const row = await db.insertNote({ chat_id: chatId, telegram_message_id: messageId, text: note, status: "received" });
  if (row === null) return; // duplicate delivery from Telegram — already handled

  const s = await score(note);
  if (s.score < config.minScore) {
    await db.updateNote(row.id, { score: s.score, score_reason: s.reason, status: "rejected_by_score" });
    await sendMessage(chatId, `⏭ No draft — scored ${s.score}/10.\n${s.reason}`, messageId);
    return;
  }
  await db.updateNote(row.id, { score: s.score, score_reason: s.reason, status: "drafting" });
  await sendMessage(chatId, `✅ Scored ${s.score}/10 — ${s.reason}\nFinding a news angle and drafting…`, messageId);

  const { news } = await findNews(note);
  const voice = await loadVoice();

  if (compare) {
    if (!config.anthropicKey) {
      await sendMessage(chatId, "COMPARE needs ANTHROPIC_API_KEY in Vercel. Drafting with Gemini only.");
    }
    const providers = config.anthropicKey ? ["gemini", "claude"] : ["gemini"];
    for (const p of providers) {
      const result = await draft(p, voice, note, news);
      await sendAndStoreDraft({ chatId, noteId: row.id, provider: p, result, news, label: p.toUpperCase() });
    }
  } else {
    const provider = config.draftProvider === "claude" && config.anthropicKey ? "claude" : "gemini";
    const result = await draft(provider, voice, note, news);
    await sendAndStoreDraft({ chatId, noteId: row.id, provider, result, news });
  }
  await db.updateNote(row.id, { status: "drafted" });
}

async function processDecision(chatId, messageId, text, replyTo) {
  if (!dbEnabled()) {
    await sendMessage(chatId, "Memory (Supabase) isn't set up yet, so decisions can't be saved.", messageId);
    return;
  }
  const [word, ...rest] = text.trim().split(/\s+/);
  const status = word.toUpperCase().startsWith("APPROVE") ? "approved" : "rejected";
  const d = await db.findDraft(chatId, replyTo);
  if (!d) {
    await sendMessage(chatId, "I couldn't find a pending draft. Reply directly to the draft message.", messageId);
    return;
  }
  await db.decideDraft(d.id, status, rest.join(" "));
  const msg = status === "approved"
    ? `👍 Draft #${d.id} marked APPROVED. Copy it and post it on LinkedIn yourself${d.used_news ? " — check the news source first" : ""}.`
    : `👎 Draft #${d.id} marked REJECTED. Kept on record so the prompts can improve.`;
  await sendMessage(chatId, msg, messageId);
}

export async function handleUpdate(update) {
  const post = update.channel_post || update.message;
  if (!post || typeof post.text !== "string") return { skipped: "no text" };

  const chatId = String(post.chat.id);
  if (config.chatId && chatId !== config.chatId) return { skipped: "other chat" };
  if (post.from?.is_bot) return { skipped: "bot" };

  const text = post.text.trim();
  const first = text.split(/\s+/)[0].toUpperCase().replace(/[^A-Z/]/g, "");

  try {
    if (first === "/START" || first === "/HELP") return void (await sendMessage(chatId, HELP));
    if (first === "APPROVE" || first === "APPROVED" || first === "REJECT" || first === "REJECTED") {
      return void (await processDecision(chatId, post.message_id, text, post.reply_to_message?.message_id));
    }
    if (/^COMPARE:/i.test(text)) {
      return void (await processNote(chatId, post.message_id, text.replace(/^COMPARE:\s*/i, ""), { compare: true }));
    }
    await processNote(chatId, post.message_id, text);
  } catch (e) {
    console.error(e);
    await sendMessage(chatId, `⚠️ Something went wrong: ${e.message}`).catch(() => {});
  }
}

// Runs the whole pipeline with Telegram, Gemini, Claude, Google News and Supabase faked.
process.env.TELEGRAM_BOT_TOKEN = "t";
process.env.TELEGRAM_CHAT_ID = "-1001";
process.env.GEMINI_API_KEY = "g";
process.env.ANTHROPIC_API_KEY = "a";
process.env.SUPABASE_URL = "https://x.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "sb_secret_x";
process.env.WEBHOOK_SECRET = "s3cret";

const sent = [], db = { notes: [], drafts: [] };
let nextMsg = 100, nextId = 1;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const body = opts.body ? JSON.parse(opts.body) : null;
  if (url.includes("api.telegram.org")) { sent.push(body.text); return json({ ok: true, result: { message_id: nextMsg++ } }); }
  if (url.includes("generativelanguage")) {
    const sys = body.system_instruction.parts[0].text, note = body.contents[0].parts[0].text;
    let out;
    if (sys.includes("screen raw notes")) out = note.includes("call vendor") ? { score: 2, reason: "Task reminder, no point of view." } : { score: 8, reason: "Specific, contrarian point with data." };
    else if (sys.includes("Google News search")) out = { keywords: ["organic reach", "LinkedIn"], query: "LinkedIn organic reach" };
    else out = { draft: "GEMINI DRAFT: the best marketing doesn't feel like marketing...", used_news: true };
    return json({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] });
  }
  if (url.includes("api.anthropic.com")) return json({ content: [{ type: "text", text: JSON.stringify({ draft: "CLAUDE DRAFT...", used_news: false }) }] });
  if (url.includes("news.google.com")) return new Response(`<rss><channel><item><title>LinkedIn cuts organic reach again - Economic Times</title><link>https://news.example/1</link><pubDate>Tue, 22 Sep 2026 08:00:00 GMT</pubDate><description>&lt;a&gt;LinkedIn cuts organic reach again&lt;/a&gt;</description><source url="https://et.com">Economic Times</source></item></channel></rss>`);
  if (url.includes("supabase.co")) {
    const [path, qs] = url.split("/rest/v1/")[1].split("?"); const q = new URLSearchParams(qs || "");
    const m = opts.method || "GET";
    if (path === "voice_skill") return json([]); // force bundled fallback
    const t = db[path];
    if (m === "POST") {
      if (path === "notes" && t.some(n => n.chat_id === body.chat_id && n.telegram_message_id === body.telegram_message_id)) return json([]);
      const row = { id: nextId++, created_at: new Date().toISOString(), ...body }; t.push(row); return json([row], 201);
    }
    const match = r => [...q].every(([k, v]) => ["order", "limit", "select", "on_conflict"].includes(k) || String(r[k]) === v.replace(/^eq\./, ""));
    if (m === "PATCH") { t.filter(match).forEach(r => Object.assign(r, body)); return new Response(null, { status: 204 }); }
    return json(t.filter(match).reverse().slice(0, 1));
  }
  throw new Error("unexpected fetch " + url);
};

const { default: handler } = await import("../api/webhook.js");
const call = async (update, secret = "s3cret") => {
  let code; const res = { status(c) { code = c; return this; }, json() { return this; }, end() { return this; } };
  await handler({ method: "POST", headers: { "x-telegram-bot-api-secret-token": secret }, body: update }, res);
  return code;
};
const post = (id, text, reply) => ({ channel_post: { message_id: id, chat: { id: -1001 }, text, ...(reply ? { reply_to_message: { message_id: reply } } : {}) } });
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("PASS:", m); };

assert(await call(post(1, "x"), "wrong") === 401, "rejects requests without the webhook secret");

sent.length = 0; await call(post(2, "remember to call vendor tomorrow"));
assert(sent.length === 1 && sent[0].includes("No draft") && sent[0].includes("2/10"), "weak note: scored low, no draft, reason sent");
assert(db.drafts.length === 0 && db.notes[0].status === "rejected_by_score", "weak note saved as rejected_by_score");

sent.length = 0; await call(post(3, "Everyone chases reach. Our 3400% jump came from replying to comments, not posting more."));
const draftMsg = sent.at(-1);
assert(draftMsg.includes("GEMINI DRAFT") && draftMsg.includes("NEWS SOURCE: LinkedIn cuts organic reach again") && draftMsg.includes("FROM: Economic Times · 2026-09-22") && draftMsg.includes("⚠ Check this before publishing"), "strong note: draft + news + verify flag");
assert(db.drafts.length === 1 && db.drafts[0].status === "pending", "draft saved as pending");

sent.length = 0; await call(post(3, "duplicate delivery"));
assert(sent.length === 0, "Telegram retry of same message is ignored");

await call(post(10, "APPROVE great one", db.drafts[0].telegram_message_id));
assert(db.drafts[0].status === "approved" && db.drafts[0].decision_note === "great one", "APPROVE reply updates status");

sent.length = 0; await call(post(11, "COMPARE: Brands are people. Write like one person talking to another, with a real example."));
assert(sent.some(s => s.includes("DRAFT — GEMINI")) && sent.some(s => s.includes("DRAFT — CLAUDE")), "COMPARE sends Gemini and Claude drafts");
const claudeDraft = db.drafts.find(d => d.provider === "claude");
assert(claudeDraft && !claudeDraft.content.includes("NEWS SOURCE"), "no verify flag when news not used");

await call(post(12, "REJECT too salesy"));
assert(db.drafts.at(-1).status === "rejected" || db.drafts.some(d => d.status === "rejected"), "REJECT without reply hits latest pending draft");

sent.length = 0; await call({ channel_post: { message_id: 20, chat: { id: -999 }, text: "hello" } });
assert(sent.length === 0, "ignores messages from other chats");
console.log("\nAll checks passed.");

import { config, dbEnabled } from "../lib/config.js";
import { handleUpdate } from "../lib/pipeline.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Health check: shows which settings are present (never the values).
    return res.status(200).json({
      ok: true,
      telegram_token: Boolean(config.telegramToken),
      chat_id: Boolean(config.chatId),
      gemini_key: Boolean(config.geminiKey),
      webhook_secret: Boolean(config.webhookSecret),
      supabase: dbEnabled(),
      claude_key: Boolean(config.anthropicKey),
      voice_profile: config.voiceProfile,
    });
  }
  if (req.method !== "POST") return res.status(405).end();

  if (config.webhookSecret && req.headers["x-telegram-bot-api-secret-token"] !== config.webhookSecret) {
    return res.status(401).json({ ok: false });
  }

  const update = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  await handleUpdate(update);
  // Always 200 so Telegram doesn't retry the same note over and over.
  return res.status(200).json({ ok: true });
}

// Visit https://<your-project>.vercel.app/api/setup?key=<WEBHOOK_SECRET> once after deploying.
// It tells Telegram to send your channel's messages to /api/webhook. Replaces the manual setWebhook URL.
import { config } from "../lib/config.js";
import { setWebhook, getWebhookInfo } from "../lib/telegram.js";

export default async function handler(req, res) {
  if (!config.webhookSecret) return res.status(500).json({ ok: false, error: "Set WEBHOOK_SECRET in Vercel first." });
  if (req.query.key !== config.webhookSecret) return res.status(401).json({ ok: false, error: "Wrong key." });
  if (!config.telegramToken) return res.status(500).json({ ok: false, error: "TELEGRAM_BOT_TOKEN is missing." });

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = `https://${host}/api/webhook`;
  try {
    await setWebhook(url, config.webhookSecret);
    const info = await getWebhookInfo();
    return res.status(200).json({ ok: true, webhook: info.url, pending: info.pending_update_count, message: "Connected. Send a note to your channel." });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

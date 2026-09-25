import { config } from "./config.js";

const LIMIT = 4000; // Telegram hard limit is 4096

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${config.telegramToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description || res.status}`);
  return data.result;
}

function split(text) {
  const parts = [];
  let rest = text;
  while (rest.length > LIMIT) {
    let cut = rest.lastIndexOf("\n", LIMIT);
    if (cut < LIMIT / 2) cut = LIMIT;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  parts.push(rest);
  return parts;
}

// Sends plain text (no markdown, so nothing breaks on stray * or _). Returns the LAST message sent.
export async function sendMessage(chatId, text, replyTo) {
  let last;
  for (const [i, part] of split(text).entries()) {
    last = await call("sendMessage", {
      chat_id: chatId,
      text: part,
      link_preview_options: { is_disabled: true },
      ...(i === 0 && replyTo ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } } : {}),
    });
  }
  return last;
}

export async function setWebhook(url, secret) {
  return call("setWebhook", {
    url,
    secret_token: secret || undefined,
    allowed_updates: ["message", "channel_post"],
    drop_pending_updates: true,
  });
}

export async function getWebhookInfo() {
  return call("getWebhookInfo", {});
}

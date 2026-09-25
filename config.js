const env = process.env;

export const config = {
  telegramToken: env.TELEGRAM_BOT_TOKEN || "",
  chatId: (env.TELEGRAM_CHAT_ID || "").trim(),
  webhookSecret: env.WEBHOOK_SECRET || "",
  geminiKey: env.GEMINI_API_KEY || "",
  geminiModel: env.GEMINI_MODEL || "gemini-3.8-flash",
  anthropicKey: env.ANTHROPIC_API_KEY || "",
  claudeModel: env.CLAUDE_MODEL || "claude-sonnet-5",
  draftProvider: (env.DRAFT_PROVIDER || "gemini").toLowerCase(),
  supabaseUrl: (env.SUPABASE_URL || "").replace(/\/$/, ""),
  supabaseKey: env.SUPABASE_SERVICE_KEY || "",
  voiceProfile: (env.VOICE_PROFILE || "srishiv").toLowerCase(),
  minScore: Number(env.MIN_SCORE || 6),
};

export const dbEnabled = () => Boolean(config.supabaseUrl && config.supabaseKey);

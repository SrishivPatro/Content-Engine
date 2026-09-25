# Content Engine

Telegram note → score (0-10) → news angle → LinkedIn draft in your voice → you APPROVE / REJECT.
Nothing is ever posted for you. You stay the author.

## Your steps (about 20 minutes)

### 1. Upload to GitHub
github.com → New repository → name it `content-engine` → Create.
Click "uploading an existing file", drag in everything inside this folder, Commit.

### 2. Deploy on Vercel
vercel.com → Add New → Project → import `content-engine`.
Before clicking Deploy, open Environment Variables and add:

| Name | Value |
|---|---|
| TELEGRAM_BOT_TOKEN | from BotFather |
| TELEGRAM_CHAT_ID | your channel ID (starts with -100) |
| GEMINI_API_KEY | from aistudio.google.com |
| WEBHOOK_SECRET | any long string of letters/numbers you make up |

Deploy. Copy the production URL (https://content-engine-xxx.vercel.app).

### 3. Connect Telegram
Open in your browser: `https://YOUR-URL/api/setup?key=YOUR_WEBHOOK_SECRET`
You should see `"ok": true`. Send a note to your channel. The draft comes back in ~15 seconds.

### 4. Memory (B1)
supabase.com → New project. SQL Editor → paste `supabase/schema.sql` → Run.
Project Settings → API: copy the Project URL and the secret (or service_role) key.
Add in Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. Then Deployments → Redeploy.

### 5. Model comparison (optional)
Add `ANTHROPIC_API_KEY` in Vercel and redeploy. Send `COMPARE: <your note>` to get both drafts.
Set `DRAFT_PROVIDER=claude` to make Claude the default drafter.

## Using it
- Any note → scored. Below 6 → no draft, with the reason.
- Reply to a draft with `APPROVE` or `REJECT` (add a reason after it if you like).
- `/help` → instructions.

## Settings (optional)
`VOICE_PROFILE` = `srishiv` (default) or `meera` · `MIN_SCORE` = 6 · `GEMINI_MODEL` = gemini-2.5-flash
Edit a voice live in Supabase → Table Editor → voice_skill.

## Troubleshooting
Open `https://YOUR-URL/api/webhook` — it shows which settings are present (true/false).
Nothing comes back? Check the bot is an admin of the channel and TELEGRAM_CHAT_ID is exact.
Vercel → your project → Logs shows any errors.

export const SCORE_SYSTEM = `You screen raw notes a founder drops into Telegram, and decide which are worth turning into a LinkedIn post.
Be strict. Most raw notes should NOT pass. A note passing means it has a real, specific point worth 200+ words.

Score 0-10:
0-2: task reminders, logistics, links with no comment, greetings, one or two words.
3-5: a topic or vague feeling with no point of view, an abandoned half-thought, something only meaningful to the author.
6-7: a clear observation or opinion with at least one specific detail (a number, an incident, a client situation, a lesson).
8-10: a sharp, specific, possibly contrarian insight with evidence or a story behind it.

Return JSON only: {"score": <integer 0-10>, "reason": "<one line, under 20 words>"}`;

export const KEYWORD_SYSTEM = `Extract a Google News search phrase from a note. Pick 3-5 of the most specific, newsworthy terms (industry, trend, platform, regulation), not generic words.
Return JSON only: {"keywords": ["..."], "query": "<short search phrase, 2-5 words>"}`;

export function draftSystem(voice) {
  return `You are ghost-drafting a LinkedIn post for a founder. It must read as if they wrote it themselves.

HOW THEY WRITE (follow this closely):
${voice}

RULES:
- Build the post around the single idea in the note. Do not add a second topic.
- Use only facts from the note and the news item. Never invent numbers, clients, results, quotes or stories.
  If the post needs a detail you don't have, leave a placeholder like [ADD: which client / what number].
- Plain text for LinkedIn: short paragraphs, no markdown, no headings, no bold. Hashtags: 0-3, only if natural.
- News item: if it is genuinely relevant, use it to make the post timely and set "used_news" to true.
  If it doesn't fit naturally, ignore it completely and set "used_news" to false. Never force it.
- Do not add a source line yourself; the system appends one.

Return JSON only: {"draft": "<the full post>", "used_news": true|false}`;
}

export function draftPrompt(note, news) {
  const newsBlock = news
    ? `NEWS ITEM (optional to use):
Headline: ${news.headline}
Source: ${news.source} · ${news.date}
Summary: ${news.summary}`
    : "NEWS ITEM: none found.";
  return `NOTE:\n${note}\n\n${newsBlock}`;
}

export function verifyBlock(news) {
  const line = "─────────────────────────────────";
  return `\n\n${line}\nNEWS SOURCE: ${news.headline}\nFROM: ${news.source} · ${news.date}\nLINK: ${news.url}\n⚠ Check this before publishing — you are the author of this claim\n${line}`;
}

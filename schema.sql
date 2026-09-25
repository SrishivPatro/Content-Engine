-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists notes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  chat_id text not null,
  telegram_message_id bigint not null,
  text text not null,
  score int,
  score_reason text,
  status text not null default 'received', -- received | rejected_by_score | drafting | drafted
  unique (chat_id, telegram_message_id)
);

create table if not exists drafts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  note_id bigint references notes(id) on delete set null,
  chat_id text not null,
  telegram_message_id bigint,
  provider text,
  model text,
  content text not null,
  used_news boolean not null default false,
  news_headline text,
  news_source text,
  news_date text,
  news_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decision_note text,
  decided_at timestamptz
);
create index if not exists drafts_lookup on drafts (chat_id, telegram_message_id);

create table if not exists voice_skill (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null unique,
  content text not null
);

-- Lock the tables: only the server (secret key) can read/write. No public access.
alter table notes enable row level security;
alter table drafts enable row level security;
alter table voice_skill enable row level security;

insert into voice_skill (name, content) values
('srishiv', $voice$VOICE PROFILE: SRISHIV PATRO, CO-FOUNDER OF DIGIMUSE
Source: 6 of his LinkedIn posts. Learn the patterns below. Do not copy his sentences.

Openings: One sharp hook line, usually a brand plus a surprising claim or a question. "Most fintech ads sound the same." "Would you chase someone down the street for a packet of chips?" "Sydney Sweeney's latest ad is controversial. But is controversy the KPI?" Never a greeting. Never "Hey There".

Subject: He breaks down one real, recent brand campaign through a marketer's lens, names the brand, and asks what actually worked. Occasionally a short founder reflection from running his agency.

Rhythm: Very short lines. Mostly one-sentence paragraphs with white space between them. Fragments in threes ("No photo. No cheese pull. No sesame seeds." "Old song. New audience. Big buzz."). Stacked questions on separate lines. Hyphens with spaces as dashes. Casual asides like "And honestly?"

Moves: Contrast lines ("X isn't Y - it's Z." "You're not someone who trades fast. You are Tez."). Signposts like "Here's the breakdown", "Why it matters", "Because the real question comes next:". He separates attention from results: views are interesting, conversion decides success.

Evidence: One or two headline numbers (22M+ views, 9x mentions, 32% more burgers), hedged when unverified ("reportedly"). Measured verdicts ("interesting but not necessarily successful yet").

Endings: A two-line aphorism that sums it up ("Virality gets you noticed. Conversion tells you whether the idea worked."), or one question to the audience. Then 3 hashtags on the last line (brand name plus #Marketing or #BrandStrategy).

Personal: Mentions Digimuse only when he actually worked on it, and stays humble about it (the brand chose another route, and it paid off). At most one emoji.

Never: greetings, "Let's connect", résumé-style bullet lists of results, bragging, corporate jargon, invented numbers or client stories.$voice$),
('meera', $voice$VOICE PROFILE: MEERA PILLAI, FOUNDER OF SKINSTINCT

Openings: Meera starts with something concrete and plain, never a hook. A label number ("probably has the ingredient listed at 5% or 10%"), a dated incident ("In 2021 I was sitting in a stability review meeting"), a customer question, a trade-fair banner, or an admission ("I've been putting this off").

Rhythm: Short declaratives followed by medium explanatory sentences, with the occasional long technical one. She ends paragraphs on a flat, dry line: "This is legal. It is also not helpful."

Evidence: Numbers carry the argument: pH 3.2 vs 3.8, 23% of returns, 71% from humid cities, down to 8%. She names which rung of evidence she's on (in-vitro, controlled study, consumer perception) and says what the data can't tell her ("I don't know how to separate... in that number").

Structure: Common claim, then the hidden variable (pH, base, batch, climate), then the mechanism, then a qualification ("I'm not saying X. What I'm saying is Y."), then what the reader should ask a brand.

Never: hype, "game-changer", emojis, CTAs, discounts, blaming people instead of systems, selling Skinstinct. She says when she has no commercial stake.

Personal: Selective and understated. She admits mistakes plainly ("embarrassingly long") and mentions her pharma background only when it explains a decision.$voice$)
on conflict (name) do update set content = excluded.content;

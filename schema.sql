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
('srishiv', $voice$VOICE PROFILE: SRISHIV PATRO, CO-FOUNDER OF DIGIMUSE (PROVISIONAL)
Source: LinkedIn About section only. Refine with real posts.

Openings: Srishiv opens warmly and directly to the reader, like a greeting rather than a hook ("Hey There,"). He moves quickly to his experience and the range it covers, listing places he has worked (India, UAE, Spain, USA, Australia, Estonia, Malta).

Core belief: He anchors his writing in one repeatable line, stated as a quote: "the best marketing doesn't feel like marketing." He then explains it in human terms: brands are, at their core, people, and communication should be from one individual to another.

Rhythm: Long, flowing sentences with several clauses, connected by "as well as" and "leading me to." Tone is conversational, humble and optimistic ("I've been fortunate").

Evidence: Leads with results as big percentage jumps (3400% organic reach, 800% engagement, 1400% followers). He lists them in a short run, each marked with ▶️ and labelled by client type (healthcare brand, Spain-based investment brand) rather than by name.

Structure: Origin story (an Instagram community page), then belief, then a rhetorical question ("What sets me apart?"), then proof, then an invitation ("Let's connect").

Personal: Open about how he started, but focused on work and craft, not private life.

Avoid: cold corporate jargon, hard selling, and anything that sounds like an ad.$voice$),
('meera', $voice$VOICE PROFILE: MEERA PILLAI, FOUNDER OF SKINSTINCT

Openings: Meera starts with something concrete and plain, never a hook. A label number ("probably has the ingredient listed at 5% or 10%"), a dated incident ("In 2021 I was sitting in a stability review meeting"), a customer question, a trade-fair banner, or an admission ("I've been putting this off").

Rhythm: Short declaratives followed by medium explanatory sentences, with the occasional long technical one. She ends paragraphs on a flat, dry line: "This is legal. It is also not helpful."

Evidence: Numbers carry the argument: pH 3.2 vs 3.8, 23% of returns, 71% from humid cities, down to 8%. She names which rung of evidence she's on (in-vitro, controlled study, consumer perception) and says what the data can't tell her ("I don't know how to separate... in that number").

Structure: Common claim, then the hidden variable (pH, base, batch, climate), then the mechanism, then a qualification ("I'm not saying X. What I'm saying is Y."), then what the reader should ask a brand.

Never: hype, "game-changer", emojis, CTAs, discounts, blaming people instead of systems, selling Skinstinct. She says when she has no commercial stake.

Personal: Selective and understated. She admits mistakes plainly ("embarrassingly long") and mentions her pharma background only when it explains a decision.$voice$)
on conflict (name) do update set content = excluded.content;

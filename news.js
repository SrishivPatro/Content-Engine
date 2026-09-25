// Google News RSS: no account, no key.
const decode = (s = "") =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
   .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ");

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]).trim() : "";
};

export function parseFirstItem(xml) {
  const item = (xml.match(/<item>([\s\S]*?)<\/item>/) || [])[1];
  if (!item) return null;
  const source = tag(item, "source");
  let headline = tag(item, "title");
  if (source && headline.endsWith(` - ${source}`)) headline = headline.slice(0, -(source.length + 3));
  const pub = tag(item, "pubDate");
  const d = pub ? new Date(pub) : null;
  const summary = decode(tag(item, "description")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    headline,
    source: source || "Unknown source",
    date: d && !isNaN(d) ? d.toISOString().slice(0, 10) : "Unknown date",
    url: tag(item, "link"),
    summary: (summary && summary !== headline ? summary : headline).slice(0, 240),
  };
}

export async function fetchNews(query) {
  if (!query) return null;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + " when:30d")}&hl=en-IN&gl=IN&ceid=IN:en`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 content-engine" } });
  if (!res.ok) return null;
  return parseFirstItem(await res.text());
}

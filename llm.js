import { config } from "./config.js";

function parseJson(text) {
  const clean = String(text).replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error("Model did not return JSON: " + clean.slice(0, 200));
}

export async function gemini({ system, prompt, json = false, model = config.geminiModel }) {
  if (!config.geminiKey) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey },
      body: JSON.stringify({
        ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: json ? 0.2 : 0.7, ...(json ? { responseMimeType: "application/json" } : {}) },
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${data?.error?.message || "unknown"}`);
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  if (!text) throw new Error("Gemini returned an empty response");
  return json ? parseJson(text) : text;
}

export async function claude({ system, prompt, json = false, model = config.claudeModel }) {
  if (!config.anthropicKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: prompt + (json ? "\n\nRespond with only the JSON object, nothing else." : "") }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Claude error ${res.status}: ${data?.error?.message || "unknown"}`);
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return json ? parseJson(text) : text;
}

import { env } from "../config/env.js";

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
const GEMINI_DRAFT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const GEMINI_SUMMARY_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-flash-lite-latest"];

const fallbackVoiceDraft = ({ transcript = "", duration = 0 }) => {
  const cleanTranscript = normalizeText(transcript);
  const sentences = cleanTranscript
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const firstSentence = sentences[0] || cleanTranscript || "Voice news bulletin";
  const title = firstSentence.slice(0, 90);
  const excerptSource = sentences.slice(0, 2).join(" ") || cleanTranscript;
  const excerpt = excerptSource.slice(0, 180) || "Voice-led local news bulletin ready for editorial review.";
  const content = cleanTranscript
    ? `${cleanTranscript}\n\nThis draft was generated from the recorded bulletin and may need editorial cleanup before publication.`
    : `Recorded voice bulletin lasting approximately ${Math.max(1, Math.round(duration || 0))} seconds. Add transcript details for a richer draft.`;

  return {
    title,
    excerpt,
    content,
  };
};

const extractJsonObject = (value) => {
  const text = String(value || "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callGeminiText = async ({ prompt, responseMimeType = "text/plain", temperature = 0.3, models = GEMINI_DRAFT_MODELS }) => {
  if (!env.geminiApiKey) {
    return "";
  }

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature,
                responseMimeType,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          return data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n").trim() || "";
        }

        if (![429, 500, 503].includes(response.status)) {
          break;
        }
      } catch {}

      await delay(350 * (attempt + 1));
    }
  }

  return "";
};

export const generateVoiceDraft = async ({ transcript = "", duration = 0 }) => {
  const cleanTranscript = normalizeText(transcript);
  const fallback = fallbackVoiceDraft({ transcript: cleanTranscript, duration });

  if (!env.geminiApiKey || !cleanTranscript) {
    return fallback;
  }

  try {
    const prompt = `
You are helping a local news desk create a first draft from a recorded voice bulletin.
Return only valid JSON with this exact shape:
{
  "title": "string",
  "excerpt": "string",
  "content": "string"
}

Rules:
- Keep the title under 90 characters.
- Keep the excerpt under 180 characters.
- Preserve important names, numbers, places, and claims from the transcript.
- The content should be clean newsroom prose in 2-4 short paragraphs.
- Do not invent district or area.
- If the transcript is unclear, still produce the best cautious draft without adding false facts.

Transcript:
${cleanTranscript}
`.trim();

    const rawText = await callGeminiText({
      prompt,
      responseMimeType: "application/json",
      temperature: 0.3,
      models: GEMINI_DRAFT_MODELS,
    });
    const parsed = extractJsonObject(rawText);

    if (!parsed) {
      return fallback;
    }

    return {
      title: normalizeText(parsed.title) || fallback.title,
      excerpt: normalizeText(parsed.excerpt) || fallback.excerpt,
      content: String(parsed.content || "").trim() || fallback.content,
    };
  } catch {
    return fallback;
  }
};

export const summarizeArticle = async (article) => {
  const sourceText = [article?.title, article?.excerpt, article?.content, article?.audioTranscript]
    .filter(Boolean)
    .join("\n\n");

  const cleanText = normalizeText(sourceText);
  if (!cleanText) {
    return "No content available for summary.";
  }

  if (!env.geminiApiKey) {
    return "";
  }

  const prompt = `
You are helping a regional newsroom generate a concise AI summary for a news article.
Write a short plain-text summary in 2 to 4 sentences.

Rules:
- Keep it under 420 characters when possible.
- Preserve names, places, dates, numbers, and claims from the article.
- Do not add facts that are not present in the source.
- Do not use bullet points, headings, markdown, or prefatory labels like "Summary:".
- If the source is incomplete, write a cautious summary using only what is stated.

Article:
${cleanText}
`.trim();

  const summary = normalizeText(
    await callGeminiText({
      prompt,
      responseMimeType: "text/plain",
      temperature: 0.2,
      models: GEMINI_SUMMARY_MODELS,
    })
  );

  return summary;
};

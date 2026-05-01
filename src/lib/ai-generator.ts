import { FeedbackTone, StarRating, GeneratedSuggestion } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface BusinessContext {
  name: string;
  category: string;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
export const MAX_REVIEW_WORDS = 40;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function truncateToWords(text: string, maxWords: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ");
  if (words.length <= maxWords) return cleaned;
  let truncated = words.slice(0, maxWords).join(" ");
  // Strip trailing punctuation that looks weird mid-sentence
  truncated = truncated.replace(/[,;:\-–—]+$/g, "").trim();
  // Strip trailing connectives/conjunctions
  truncated = truncated.replace(/\s+(and|but|or|with|for|to|of|the|a|an)$/i, "").trim();
  // Ensure terminal punctuation
  if (!/[.!?]$/.test(truncated)) truncated += ".";
  return truncated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeded PRNG fallback (used only when no GEMINI_API_KEY)
// ─────────────────────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildTimeSeed(
  businessKey: string,
  rating: StarRating,
  tone: FeedbackTone,
  minuteTimestamp?: number
): number {
  const minute = minuteTimestamp ?? Math.floor(Date.now() / 60000);
  const str = `${businessKey}|${rating}|${tone}|${minute}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// Short, ≤40-word phrase banks for offline fallback
const SHORT_OPENERS: Record<StarRating, string[]> = {
  5: ["Absolute gem", "Fantastic find", "Genuinely brilliant", "Loved every second", "Top tier", "Truly impressive", "Outstanding visit"],
  4: ["Really solid", "Very enjoyable", "Pretty great overall", "Strong showing", "Mostly excellent"],
  3: ["A mixed bag", "Just okay", "Average experience", "Has potential", "Hit and miss"],
  2: ["A bit disappointing", "Underwhelming", "Fell short", "Not great"],
  1: ["Really poor experience", "Avoid", "Big letdown", "Genuinely bad"],
};

const TONE_FLAVOR: Record<FeedbackTone, string[]> = {
  enthusiastic: ["amazing!", "love it!", "highly recommend!", "must visit!"],
  professional: ["recommended.", "would return.", "well executed.", "professional throughout."],
  casual: ["really nice.", "good vibes.", "would go again.", "solid spot."],
  detailed: ["quality across the board.", "consistent and thoughtful.", "well-judged throughout."],
};

function buildShortReview(
  business: BusinessContext,
  rating: StarRating,
  tone: FeedbackTone,
  keywords: string[],
  seed: number,
  variant: number
): string {
  const rand = mulberry32(seed + variant * 999983 + variant * variant * 7);
  const opener = pick(SHORT_OPENERS[rating], rand);
  const flavor = pick(TONE_FLAVOR[tone], rand);
  const kw = keywords.length ? pick(keywords, rand) : business.category;
  const subject = rand() > 0.5 ? business.name : "this place";

  const templates: string[] = [
    `${opener} — ${subject} nailed the ${kw}, ${flavor}`,
    `${opener}. ${subject} delivers on ${kw} — ${flavor}`,
    `Visited ${subject} for ${kw}. ${opener} and ${flavor}`,
    `${subject} for ${kw}? ${opener} — ${flavor}`,
  ];

  const raw = pick(templates, rand);
  return truncateToWords(raw, MAX_REVIEW_WORDS);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini path — primary AI provider when GEMINI_API_KEY is set
// ─────────────────────────────────────────────────────────────────────────────
const TONE_DESCRIPTIONS: Record<FeedbackTone, string> = {
  enthusiastic: "very excited and positive, natural exclamation marks allowed",
  professional: "formal, balanced, business-like, no slang",
  casual: "friendly, conversational, relaxed phrasing",
  detailed: "specific and observational, packs concrete detail in few words",
};

const RATING_DESCRIPTIONS: Record<StarRating, string> = {
  1: "very disappointed — clear unresolved issues",
  2: "somewhat dissatisfied — notable problems",
  3: "neutral — mixed experience, room to improve",
  4: "mostly satisfied — minor caveats only",
  5: "completely delighted — exceptional experience",
};

interface GeminiOutput {
  keywords?: string[];
  reviews: { text: string }[];
}

async function generateWithGemini(
  business: BusinessContext,
  rating: StarRating,
  tone: FeedbackTone,
  userKeywords: string[],
  count: number
): Promise<GeneratedSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY!;

  const keywordInstruction = userKeywords.length
    ? `Use these SEO keywords (provided by the business owner): ${userKeywords.join(", ")}. Echo them in the "keywords" field of the response.`
    : `Read the business details carefully and extract 4-6 SEO keywords a real customer might search Google for. Think: location terms, specific services, unique offerings, niche descriptors. Avoid generic words ("good", "nice"). Return them in the "keywords" field.`;

  const prompt = `You write authentic Google Business reviews. Read the business profile, infer SEO keywords, then write reviews.

BUSINESS PROFILE
Name: ${business.name}
Category: ${business.category}
Description: ${business.description}

TASK
1. ${keywordInstruction}
2. Generate ${count} UNIQUE Google review snippets.

HARD RULES
- Each review MUST be ${MAX_REVIEW_WORDS} words or fewer. Count words. Stop early rather than overshoot.
- Naturally weave 1-2 of the SEO keywords into each review. Do NOT stuff keywords.
- Each review must be structurally distinct: different opener, different angle, different rhythm.
- Sentiment: ${RATING_DESCRIPTIONS[rating]}
- Tone: ${TONE_DESCRIPTIONS[tone]}
- Sound like a real customer. Avoid AI clichés ("10/10", "absolutely amazing", "exceeded expectations").
- Do NOT include star rating numbers, "5 stars", or hashtags.

OUTPUT
Return ONLY valid minified JSON, no markdown fences, no preamble:
{"keywords":["..."],"reviews":[{"text":"..."},{"text":"..."},{"text":"..."}]}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.95,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!raw) throw new Error("Gemini returned empty content");

  // Strip stray markdown fences just in case (responseMimeType usually prevents them)
  const cleaned = raw.replace(/```json\s*|```\s*/g, "").trim();
  const parsed: GeminiOutput = JSON.parse(cleaned);

  if (!parsed?.reviews?.length) {
    throw new Error("Gemini response missing reviews array");
  }

  const finalKeywords =
    userKeywords.length > 0
      ? userKeywords
      : Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k) => typeof k === "string").slice(0, 6)
      : [];

  return parsed.reviews.slice(0, count).map((item) => ({
    id: uuidv4(),
    text: truncateToWords(item.text, MAX_REVIEW_WORDS), // safety net
    tone,
    rating,
    keywords: finalKeywords,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
export async function generateFeedbackSuggestions(
  business: BusinessContext,
  rating: StarRating,
  tone: FeedbackTone,
  keywords: string[] = [],
  count: number = 3,
  minuteTimestamp?: number
): Promise<GeneratedSuggestion[]> {
  // 1️⃣ Prefer Gemini when API key is present
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateWithGemini(business, rating, tone, keywords, count);
    } catch (err) {
      console.warn("Gemini API failed, using seeded fallback:", err);
    }
  }

  // 2️⃣ Offline / no-key fallback — short, seeded, deterministic per minute
  const seed = buildTimeSeed(
    business.name + business.description,
    rating,
    tone,
    minuteTimestamp
  );

  return Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    text: buildShortReview(business, rating, tone, keywords, seed, i),
    tone,
    rating,
    keywords,
  }));
}

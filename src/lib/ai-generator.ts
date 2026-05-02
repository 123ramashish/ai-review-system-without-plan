import {
  FeedbackTone,
  ReviewLanguage,
  StarRating,
  GeneratedSuggestion,
} from "@/types";
import { v4 as uuidv4 } from "uuid";
import {
  MIN_REVIEW_WORDS,
  MAX_REVIEW_WORDS,
  clipBusinessDescription,
  clampReviewWordCount,
  reviewPadFragments,
} from "./review-bounds";

export { MIN_REVIEW_WORDS, MAX_REVIEW_WORDS } from "./review-bounds";

interface BusinessContext {
  name: string;
  category: string;
  description: string;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

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
  minuteTimestamp?: number,
  language: ReviewLanguage = "hinglish"
): number {
  const minute = minuteTimestamp ?? Math.floor(Date.now() / 60000);
  const str = `${businessKey}|${rating}|${tone}|${language}|${minute}`;
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

const SHORT_OPENERS: Record<StarRating, string[]> = {
  5: ["Absolute gem honestly", "Fantastic find, no cap", "Genuinely brilliant place", "Loved every second here", "Top tier experience", "Truly impressive visit", "Outstanding — would come again"],
  4: ["Really solid overall", "Very enjoyable visit", "Pretty great mostly", "Strong showing", "Mostly excellent tbh"],
  3: ["Mixed bag if im honest", "Just okay this time", "Average experience", "Has potential but uneven", "Hit and miss visit"],
  2: ["Bit disappointing honestly", "Underwhelmed overall", "Fell short of hopes", "Not great this round"],
  1: ["Really poor experience", "Would avoid sadly", "Big letdown", "Genuinely bad visit"],
};

const TONE_FLAVOR: Record<FeedbackTone, string[]> = {
  enthusiastic: ["amazing vibes!", "love it, highly recommend!", "must visit fr!", "so worth it!"],
  professional: ["recommended overall.", "would return.", "well executed.", "professional throughout."],
  casual: ["really nice spot.", "good vibes.", "would go again.", "solid place tbh."],
  detailed: ["quality was thoughtful.", "consistent details.", "well judged overall."],
};

const ENGLISH_MID: Record<StarRating, string[]> = {
  5: [
    "Atmosphere and service both felt spot on; hard to find anything to complain about.",
    "Everything was timely, staff paid attention, and the place looked clean and well kept.",
  ],
  4: [
    "Most of the visit was genuinely strong; only tiny things I would tweak next time.",
    "Overall satisfying — a bit more polish in one or two areas and it would be perfect.",
  ],
  3: [
    "Some parts impressed me and others felt average; consistency was the weak spot.",
    "Neither amazing nor terrible — a middle of the road experience honestly.",
  ],
  2: [
    "Several things fell short of what I expected; communication could be clearer.",
    "Gaps showed up in a few places; management should take a closer look.",
  ],
  1: [
    "Coordination and quality issues made the visit frustrating overall.",
    "Did not match basic expectations; real improvement is needed soon.",
  ],
};

const HINDI_OPENERS: Record<StarRating, string[]> = {
  5: ["बहुत शानदार अनुभव रहा", "दिल से खुश हूँ, कमाल की जगह है", "एकदम टॉप क्लास लगा", "यहाँ आकर मज़ा आ गया", "सच में प्रभावित हूँ"],
  4: ["कुल मिलाकर अच्छा रहा", "काफी संतोषजनक अनुभव था", "ज़्यादातर चीज़ें अच्छी थीं", "अच्छा अनुभव रहा कुल मिलाकर"],
  3: ["ठीक-ठाक रहा, मिला-जुला अनुभव", "न अच्छा न बुरा — बीच का", "कुछ अच्छा कुछ औसत", "औसत दर्जे का अनुभव रहा"],
  2: ["उम्मीद से कम लगा", "कई बातों में कमी दिखी", "निराशाजनक पहलू भी थे", "अपेक्षा पूरी नहीं हुई"],
  1: ["बहुत खराब अनुभव रहा", "सुधार ज़रूरी है", "दोबारा नहीं जाना चाहूँगा", "मैनेजमेंट को ध्यान देना चाहिए"],
};

const HINDI_TONE: Record<FeedbackTone, string[]> = {
  enthusiastic: ["दोस्तों को भी ज़रूर बताऊँगा!", "दोबारा ज़रूर आऊँगा!", "दिल से सुझाव देता हूँ!"],
  professional: ["संतुलित सेवा मिली।", "वापस आने में हिचक नहीं होगी।", "कुल मिलाकर उचित अनुभव।"],
  casual: ["रिलैक्स्ड माहौल था।", "फिर से आ सकता हूँ।", "ठीक-ठाक वाइब्स।"],
  detailed: ["विवरण पर ध्यान दिया गया था।", "गुणवत्ता में स्थिरता दिखी।", "कुल मिलाकर सोच-समझकर चलाया गया।"],
};

const HINDI_MID: Record<StarRating, string[]> = {
  5: [
    "सेवा समय पर थी और स्टाफ सहयोगी रहा, सफाई भी ठीक दिखी।",
    "माहौल अच्छा था, हर चीज़ संभालकर की गई लगी।",
  ],
  4: [
    "ज़्यादातर चीज़ें अच्छी थीं, छोटी-छोटी बातें और बेहतर हो सकती हैं।",
    "कुल मिलाकर संतोषजनक, एकाध जगह थोड़ा सुधार हो तो बेहतर।",
  ],
  3: [
    "कुछ पल अच्छे लगे, कुछ औसत — लगातारता की कमी महसूस हुई।",
    "न तो वाह न तो हाय — बीच का अनुभव रहा।",
  ],
  2: [
    "उम्मीद के मुकाबले कमज़ोर लगा, संवाद साफ़ नहीं था।",
    "कई जगह कमियाँ दिखीं, प्रबंधन को देखना चाहिए।",
  ],
  1: [
    "समन्वय और गुणवत्ता दोनों में समस्या थी।",
    "मानक पूरे नहीं हुए, तुरंत सुधार ज़रूरी है।",
  ],
};

const HINGLISH_MID: Record<StarRating, string[]> = {
  5: [
    "Jo bhi expect kiya tha usse upar deliver hua, atmosphere bhi on point tha",
    "Service timely thi, staff ne dhyan rakha, hygiene bhi theek dikhi",
  ],
  4: [
    "Almost sab kuch acha tha, choti choti baatein improve ho sakti hain",
    "Overall satisfying raha, ek do points pe thoda aur polish chahiye",
  ],
  3: [
    "Kuch cheezein achi thin kuch average, consistency ka issue tha",
    "Na wow na worst — middle of the road type experience",
  ],
  2: [
    "Expectations ke against weak laga, communication bhi clear nahi thi",
    "Kaafi jagah pe gaps dikhe, management ko dekhna chahiye",
  ],
  1: [
    "Poor coordination aur quality issues — time waste feel hua",
    "Standard bilkul match nahi kiya, improvement urgent hai",
  ],
};

function buildShortReview(
  business: BusinessContext,
  rating: StarRating,
  tone: FeedbackTone,
  keywords: string[],
  seed: number,
  variant: number,
  language: ReviewLanguage
): string {
  const rand = mulberry32(seed + variant * 999983 + variant * variant * 7);
  const kw = keywords.length ? pick(keywords, rand) : business.category;
  const subject = rand() > 0.5 ? business.name : "this place";
  const pads = reviewPadFragments(
    business.name,
    business.category,
    keywords.length ? keywords : [kw],
    language
  );

  if (language === "english") {
    const opener = pick(SHORT_OPENERS[rating], rand);
    const flavor = pick(TONE_FLAVOR[tone], rand);
    const mid = pick(ENGLISH_MID[rating], rand);
    const raw = `${opener} — visited ${subject} for ${kw}. ${mid} ${flavor}`;
    return clampReviewWordCount(raw, MIN_REVIEW_WORDS, MAX_REVIEW_WORDS, pads, "english");
  }

  if (language === "hindi") {
    const opener = pick(HINDI_OPENERS[rating], rand);
    const flavor = pick(HINDI_TONE[tone], rand);
    const mid = pick(HINDI_MID[rating], rand);
    const place = rand() > 0.5 ? business.name : "यह जगह";
    const raw = `${opener}। ${place} में ${kw} के संदर्भ में गया था। ${mid} ${flavor}`;
    return clampReviewWordCount(raw, MIN_REVIEW_WORDS, MAX_REVIEW_WORDS, pads, "hindi");
  }

  const opener = pick(SHORT_OPENERS[rating], rand);
  const flavor = pick(TONE_FLAVOR[tone], rand);
  const midHi = pick(HINGLISH_MID[rating], rand);
  const raw = `${opener} — visited ${subject} for ${kw} related stuff. ${midHi}. ${flavor} Google pe "${kw}" type searches ke liye relevant hi lagta hai yahan ka offering.`;
  return clampReviewWordCount(raw, MIN_REVIEW_WORDS, MAX_REVIEW_WORDS, pads, "hinglish");
}

function geminiLanguageBlock(lang: ReviewLanguage): string {
  switch (lang) {
    case "english":
      return `LANGUAGE (mandatory): Write the ENTIRE review in English only. Do not use Devanagari or other scripts. Keep SEO keywords in English as natural search terms.`;
    case "hindi":
      return `LANGUAGE (mandatory): Write primarily in Hindi using Devanagari script (हिंदी). You may keep universal brand names, app names, or product names in Latin letters when natural (e.g. Google, pizza). SEO keywords may appear in Hindi or transliterated form as real users would type.`;
    case "hinglish":
    default:
      return `LANGUAGE (mandatory): Naturally mix Hindi (Devanagari) and English in the same sentences (Hinglish), the way Indian customers type on phones. Example tone: "service fast thi, staff polite thi, coffee bhi strong tha".`;
  }
}

const TONE_DESCRIPTIONS: Record<FeedbackTone, string> = {
  enthusiastic: "very excited and positive; casual energy; occasional typo ok",
  professional: "mostly polished but still a real person; not corporate robot",
  casual: "friendly, conversational, relaxed; some shortenings (tbh, kinda)",
  detailed: "specific and observational; still reads like a normal person typing on phone",
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
  count: number,
  language: ReviewLanguage
): Promise<GeneratedSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY!;

  const desc = clipBusinessDescription(business.description);
  const keywordInstruction = userKeywords.length
    ? `Use these SEO keywords (from the owner): ${userKeywords.join(", ")}. Echo them in the "keywords" field.`
    : `From the description, extract 4-6 SEO phrases real customers would type in Google (services, location hints, niche terms). Avoid generic words. Put them in "keywords".`;

  const prompt = `You write authentic Google Business reviews. ${geminiLanguageBlock(language)}

FIRST read the business profile CAREFULLY. Every review must reflect THIS business (services, vibe, what they sell) — not generic praise.

BUSINESS PROFILE
Name: ${business.name}
Category: ${business.category}
Description (max ${10000} chars used here; truncated if longer):
${desc}

TASK
1. ${keywordInstruction}
2. Write ${count} UNIQUE reviews. Each must mention something specific implied by the description (dishes, treatments, products, area, hours vibe, etc.) when possible.

STYLE (critical)
- Human / imperfect: occasional small typos, shorthand — NOT polished AI prose (unless LANGUAGE is English-only, still sound like a real person).
- SEO: weave 1-2 keywords naturally (no stuffing, no lists, no hashtags).
- Word count: EACH review must be BETWEEN ${MIN_REVIEW_WORDS} AND ${MAX_REVIEW_WORDS} words (count carefully). If unsure, aim ~40-80 words.
- Sentiment: ${RATING_DESCRIPTIONS[rating]}
- Tone: ${TONE_DESCRIPTIONS[tone]}
- No star numbers, no "5 stars", no "10/10", no "exceeded expectations" clichés.

OUTPUT
Return ONLY minified JSON, no markdown:
{"keywords":["..."],"reviews":[{"text":"..."},...]}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.95,
        topP: 0.95,
        maxOutputTokens: 8192,
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

  const pads = reviewPadFragments(
    business.name,
    business.category,
    finalKeywords.length ? finalKeywords : userKeywords,
    language
  );

  return parsed.reviews.slice(0, count).map((item) => ({
    id: uuidv4(),
    text: clampReviewWordCount(item.text, MIN_REVIEW_WORDS, MAX_REVIEW_WORDS, pads, language),
    tone,
    rating,
    keywords: finalKeywords,
  }));
}

export async function generateFeedbackSuggestions(
  business: BusinessContext,
  rating: StarRating,
  tone: FeedbackTone,
  keywords: string[] = [],
  count: number = 3,
  minuteTimestamp?: number,
  language: ReviewLanguage = "hinglish"
): Promise<GeneratedSuggestion[]> {
  const ctx: BusinessContext = {
    ...business,
    description: clipBusinessDescription(business.description),
  };

  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateWithGemini(ctx, rating, tone, keywords, count, language);
    } catch (err) {
      console.warn("Gemini API failed, using seeded fallback:", err);
    }
  }

  const seed = buildTimeSeed(ctx.name + ctx.description, rating, tone, minuteTimestamp, language);

  return Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    text: buildShortReview(ctx, rating, tone, keywords, seed, i, language),
    tone,
    rating,
    keywords,
  }));
}

/** Client preview while /api/generate is loading — same offline logic as server fallback. */
export function buildClientPreviewReview(
  business: { name: string; category: string; description: string },
  rating: StarRating,
  tone: FeedbackTone,
  keywords: string[],
  minuteTimestamp: number,
  variant: number,
  language: ReviewLanguage
): string {
  const ctx: BusinessContext = {
    name: business.name,
    category: business.category,
    description: clipBusinessDescription(business.description),
  };
  const seed = buildTimeSeed(ctx.name + ctx.description, rating, tone, minuteTimestamp, language);
  return buildShortReview(ctx, rating, tone, keywords, seed, variant, language);
}

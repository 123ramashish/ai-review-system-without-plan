import type { ReviewLanguage } from "@/types";

/** Limits for AI / fallback review text (word = whitespace-separated token). */
export const MIN_REVIEW_WORDS = 20;
export const MAX_REVIEW_WORDS = 200;
export const MAX_BUSINESS_DESCRIPTION_CHARS = 10000;

export function countWords(text: string): number {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

export function truncateToWords(text: string, maxWords: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length <= maxWords) return cleaned;
  let truncated = words.slice(0, maxWords).join(" ");
  truncated = truncated.replace(/[,;:\-–—]+$/g, "").trim();
  truncated = truncated.replace(/\s+(and|but|or|with|for|to|of|the|a|an)$/i, "").trim();
  if (!/[.!?]$/.test(truncated)) truncated += ".";
  return truncated;
}

const EMERGENCY_PAD: Record<ReviewLanguage, string> = {
  english:
    " I would happily recommend this place to anyone searching for the same kind of service nearby.",
  hindi:
    " मैं दोस्तों और परिवार को भी यहाँ आने की सलाह दूँगा, कुल मिलाकर अच्छा अनुभव रहा।",
  hinglish:
    " Location convenient hai, Google pe bhi easily mil jata hai, friends ko bhi suggest karunga.",
};

/** Ensure word count is in [min, max] by truncating or appending tails. */
export function clampReviewWordCount(
  text: string,
  minWords: number,
  maxWords: number,
  padTailPool: string[],
  language: ReviewLanguage = "hinglish"
): string {
  let out = truncateToWords(text, maxWords);
  let n = countWords(out);
  if (n >= minWords) return out;

  const pool = padTailPool.length ? padTailPool : ["Thanks team, overall solid experience."];
  let i = 0;
  while (countWords(out) < minWords && i < 80) {
    const frag = pool[i % pool.length];
    out = `${out.replace(/\s+$/g, "")} ${frag}`.replace(/\s+/g, " ").trim();
    out = truncateToWords(out, maxWords);
    i++;
  }
  if (countWords(out) < minWords) {
    out = truncateToWords(
      `${out} ${EMERGENCY_PAD[language]}`.replace(/\s+/g, " ").trim(),
      maxWords
    );
  }
  return out;
}

export function clipBusinessDescription(description: string): string {
  const t = description.trim();
  if (t.length <= MAX_BUSINESS_DESCRIPTION_CHARS) return t;
  return t.slice(0, MAX_BUSINESS_DESCRIPTION_CHARS);
}

/** Short tails to pad offline / preview reviews up to MIN_REVIEW_WORDS. */
export function reviewPadFragments(
  businessName: string,
  category: string,
  keywords: string[],
  language: ReviewLanguage = "hinglish"
): string[] {
  const k = (keywords[0] || category || "service").replace(/\s+/g, " ").trim();
  const shortName = businessName.slice(0, 60);

  if (language === "english") {
    return [
      `Honestly ${shortName} delivered on ${k} better than I expected.`,
      `Staff were busy but still helpful; wait time was acceptable.`,
      `The location shows up accurately on Google Maps.`,
      `Good value for money — I would suggest it to friends.`,
      `Relaxed vibe; fine to visit with family too.`,
      `Quality felt consistent throughout the visit.`,
      `I found them by searching for "${k}" — glad I did.`,
      `Overall a productive visit; I will probably come back.`,
    ];
  }

  if (language === "hindi") {
    return [
      `${shortName} में ${k} का अनुभव उम्मीद से बेहतर रहा।`,
      `स्टाफ व्यस्त था फिर भी मददगार रहा, इंतज़ार सहनीय था।`,
      `गूगल मैप्स पर लोकेशन सही दिखती है।`,
      `पैसे के हिसाब से ठीक लगा, दोस्तों को भी सुझाऊँगा।`,
      `माहौल आरामदायक था, परिवार के साथ भी ठीक रहेगा।`,
      `गुणवत्ता में लगातारता दिखी।`,
      `मैंने "${k}" खोजकर यहाँ पाया — उपयोगी रहा।`,
      `कुल मिलाकर अच्छा अनुभव रहा, दोबारा आने की इच्छा है।`,
    ];
  }

  return [
    `${shortName} ka ${k} experience honestly better than expected tha.`,
    `Staff thodi busy thi par helpful rahi, wait acceptable tha.`,
    `Location Google pe accurate hai, area mein aur options bhi hain.`,
    `Value for money theek lagi, friends ko bhi suggest karunga yahan.`,
    `Ambiance relaxed tha, family ke sath bhi theek rahega.`,
    `Quality consistent lagi, thoda human touch feel hua jo acha laga.`,
    `SEO wise maine "${k}" search kiya tha tabhi mila, useful raha.`,
    `Overall visit productive raha, next time bhi try karunga.`,
  ];
}

export function normalizeReviewLanguage(
  value: unknown,
  fallback: ReviewLanguage = "hinglish"
): ReviewLanguage {
  if (value === "english" || value === "hindi" || value === "hinglish") return value;
  return fallback;
}

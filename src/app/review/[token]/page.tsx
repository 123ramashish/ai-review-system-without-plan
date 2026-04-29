"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Star, Copy, Check, ExternalLink, Sparkles,
  RefreshCw, ChevronRight, ArrowLeft, MapPin, Clock,
} from "lucide-react";
import { FeedbackTone, StarRating, GeneratedSuggestion } from "@/types";

const TONES: { value: FeedbackTone; label: string; emoji: string; desc: string }[] = [
  { value: "enthusiastic", label: "Enthusiastic", emoji: "🎉", desc: "Excited & glowing" },
  { value: "professional", label: "Professional", emoji: "💼", desc: "Formal & balanced" },
  { value: "casual",       label: "Casual",       emoji: "😊", desc: "Friendly & relaxed" },
  { value: "detailed",     label: "Detailed",     emoji: "📝", desc: "Thorough & specific" },
];

const RATING_LABELS = ["", "Poor", "Below Average", "Okay", "Good", "Excellent!"];
const RATING_COLORS = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-lime-400", "text-brand-400"];

type Step = "select" | "suggestions";

interface BusinessInfo {
  _id: string;
  name: string;
  category: string;
  description: string;
  googleReviewUrl: string;
}

// ── Seeded PRNG — same as server, used for instant client-side fallback ───────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildClientSeed(key: string, rating: StarRating, tone: FeedbackTone, minute: number) {
  const str = `${key}|${rating}|${tone}|${minute}`;
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

// Client-side phrase banks (mirror of server) — used as instant fallback
const CAT_THINGS: Record<string, string[]> = {
  restaurant: ["the food", "the dishes", "the menu", "the cuisine", "the flavours", "the presentation"],
  cafe:       ["the coffee", "the pastries", "the brunch", "the cakes", "the drinks", "the flat white"],
  salon:      ["the treatment", "the styling", "the results", "the colour work", "the cut"],
  gym:        ["the equipment", "the classes", "the facilities", "the training programmes", "the weights area"],
  hotel:      ["the room", "the breakfast", "the amenities", "the service", "the restaurant"],
  retail:     ["the selection", "the range", "the products", "the quality", "the prices"],
  medical:    ["the consultation", "the treatment", "the care", "the advice", "the follow-up"],
  automotive: ["the work", "the repairs", "the service", "the diagnostics", "the MOT"],
  services:   ["the work", "the results", "the deliverables", "the service", "the project"],
  other:      ["the service", "the experience", "the quality", "the overall offering"],
};

const CAT_STAFF: Record<string, string[]> = {
  restaurant: ["the chef", "our server", "the team", "the host", "the kitchen crew"],
  cafe:       ["the barista", "the team", "the staff", "the owner"],
  salon:      ["my stylist", "the colourist", "the team", "the technician"],
  gym:        ["the trainer", "the instructors", "my PT", "the floor staff"],
  hotel:      ["the front desk team", "the concierge", "the staff", "the housekeeping team"],
  retail:     ["the assistant", "the team", "the sales staff", "the floor team"],
  medical:    ["the doctor", "the nurse", "the specialist", "the practitioner"],
  automotive: ["the mechanic", "the technician", "the team", "the service advisor"],
  services:   ["the team", "the consultant", "the specialist", "the account manager"],
  other:      ["the team", "the staff", "the people there"],
};

const OPENERS_5 = [
  "Genuinely one of the best experiences I've had",
  "Completely blown away by this place",
  "An outstanding visit from start to finish",
  "Rarely do I leave somewhere feeling this positive",
  "This place is truly something special",
  "Exceeded every expectation I had coming in",
  "I came with high hopes and left with them surpassed",
];
const OPENERS_4 = [
  "Really enjoyed my visit here",
  "A very solid experience overall",
  "Left feeling genuinely satisfied",
  "Very nearly perfect — close to five stars",
  "Came away happy and would return",
  "A great visit with only the smallest of caveats",
];
const OPENERS_3 = [
  "A mixed bag, if I'm being honest",
  "Had an okay experience — nothing more",
  "Neither blown away nor particularly disappointed",
  "Some genuinely good moments, some less so",
  "There's real potential here but it wasn't quite there",
];
const OPENERS_2 = [
  "Disappointed, if I'm being honest",
  "Not the experience I was hoping for",
  "Quite a few things fell short on this visit",
  "Had been looking forward to this but came away underwhelmed",
];
const OPENERS_1 = [
  "Really not a good experience at all, unfortunately",
  "A deeply disappointing experience from start to finish",
  "I rarely leave a one-star review but this warranted one",
  "Left feeling genuinely frustrated",
];

const CLOSERS_5: Record<FeedbackTone, string[]> = {
  enthusiastic: [
    "I'll absolutely be back and am already recommending this place to everyone I know!",
    "Cannot wait to return — this is firmly my new go-to spot!",
    "Would give ten stars if I could — an absolute gem!",
  ],
  professional: [
    "I would recommend this establishment to colleagues without any reservation.",
    "A benchmark in its category — I will return and refer others with confidence.",
    "This is the standard that others in this sector should be actively aspiring to.",
  ],
  casual: [
    "Will definitely be back — honestly love this place!",
    "Telling all my friends about it — would absolutely recommend!",
    "Already looking forward to my next visit.",
  ],
  detailed: [
    "In summary: an exceptional experience across all assessed dimensions. Unreservedly recommended.",
    "Based on this visit alone, I would return and recommend with complete confidence.",
  ],
};

const CLOSERS_4: Record<FeedbackTone, string[]> = {
  enthusiastic: ["Would absolutely go back — really enjoyed it overall!", "A great spot — highly recommend with only the tiniest of caveats!"],
  professional: ["I would recommend this business and intend to return.", "Overall a strong experience I would endorse to others."],
  casual:       ["Would happily go back and recommend it to friends.", "Thumbs up from me — would return without question."],
  detailed:     ["Overall a strong visit with only marginal areas for improvement. Would return."],
};

const CLOSERS_3: Record<FeedbackTone, string[]> = {
  enthusiastic: ["Might give it another shot — I think it could be great with a few tweaks!", "There's definitely potential — rooting for them to improve!"],
  professional: ["I would consider returning once the noted areas for improvement have been addressed."],
  casual:       ["Might go back if they sort a few things out.", "Not sure I'd rush back but wouldn't rule it out."],
  detailed:     ["A return visit would be considered if the noted inconsistencies were resolved."],
};

const CLOSERS_2: Record<FeedbackTone, string[]> = {
  enthusiastic: ["Really hoping they sort things out — the potential is there!", "Would need to see real improvement before going back."],
  professional: ["I would not recommend in the current state but would reconsider following demonstrated improvement."],
  casual:       ["Not somewhere I'd rush back to without hearing things have improved."],
  detailed:     ["A return visit would only be considered following demonstrated improvement across key failure areas."],
};

const CLOSERS_1: Record<FeedbackTone, string[]> = {
  enthusiastic: ["Really hope management sees this and takes action — urgent changes are needed!"],
  professional: ["I cannot recommend this business and urge management to undertake a comprehensive review."],
  casual:       ["Would save others the hassle and avoid until major improvements are made."],
  detailed:     ["Until fundamental improvements across service, quality, and staff management are demonstrated, this business cannot be recommended."],
};

function buildClientReview(
  business: BusinessInfo,
  rating: StarRating,
  tone: FeedbackTone,
  seed: number,
  variant: number
): string {
  const rand = mulberry32(seed + variant * 999983 + variant * variant * 7);
  const cat = business.category in CAT_THINGS ? business.category : "other";

  const thing  = pick(CAT_THINGS[cat],  rand);
  const staff  = pick(CAT_STAFF[cat],   rand);

  const openerMap: Record<StarRating, string[]> = {
    5: OPENERS_5, 4: OPENERS_4, 3: OPENERS_3, 2: OPENERS_2, 1: OPENERS_1,
  };
  const closerMap: Record<StarRating, Record<FeedbackTone, string[]>> = {
    5: CLOSERS_5, 4: CLOSERS_4, 3: CLOSERS_3, 2: CLOSERS_2, 1: CLOSERS_1,
  };

  const opener = pick(openerMap[rating], rand);
  const closer = pick(closerMap[rating][tone], rand);

  const sentimentMid: Record<StarRating, string[]> = {
    5: ["everything was absolutely spot on", "every detail had clearly been thought through", "I couldn't fault a single thing"],
    4: ["the vast majority of the experience was genuinely great", "almost everything was really impressive", "things were strong across the board"],
    3: ["some moments stood out positively while others fell flat", "the experience was inconsistent throughout", "there were good bits but also things that could be better"],
    2: ["several things fell notably short of expectations", "there were real issues that affected the visit", "the experience was below what I'd hoped for"],
    1: ["nothing seemed to work as it should", "issues appeared at every stage without resolution", "it was a genuinely difficult experience throughout"],
  };

  const mid = pick(sentimentMid[rating], rand);

  const parts = [
    `${thing} ${rating >= 4 ? "was impressive" : rating === 3 ? "was okay but inconsistent" : "was below standard"}`,
    `${staff} ${rating >= 4 ? "were attentive and helpful" : rating === 3 ? "were variable in their approach" : "didn't handle things well"}`,
  ];

  const usedPart = pick(parts, rand);

  return `${opener} — ${mid}. ${usedPart}. ${closer}`;
}

export default function ReviewPage() {
  const params  = useParams();
  const token   = params.token as string;

  const [step,            setStep]            = useState<Step>("select");
  const [business,        setBusiness]        = useState<BusinessInfo | null>(null);
  const [sessionId,       setSessionId]       = useState<string>("");
  const [rating,          setRating]          = useState<StarRating>(5);
  const [hoveredRating,   setHoveredRating]   = useState<number>(0);
  const [tone,            setTone]            = useState<FeedbackTone>("enthusiastic");
  const [suggestions,     setSuggestions]     = useState<(GeneratedSuggestion & { dbId?: string })[]>([]);
  const [selectedIdx,     setSelectedIdx]     = useState<number>(0);
  const [editedText,      setEditedText]      = useState<string>("");
  const [loading,         setLoading]         = useState(false);
  const [initialLoading,  setInitialLoading]  = useState(true);
  const [copied,          setCopied]          = useState(false);
  const [redirecting,     setRedirecting]     = useState(false);
  const [error,           setError]           = useState<string>("");

  // ── Per-minute time seed ──────────────────────────────────────────────────
  const [minuteTimestamp, setMinuteTimestamp] = useState(() => Math.floor(Date.now() / 60000));
  const [secsLeft,        setSecsLeft]        = useState(() => 60 - (Math.floor(Date.now() / 1000) % 60));

  useEffect(() => {
    const iv = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);
      const nowMin = Math.floor(nowSec / 60);
      setSecsLeft(60 - (nowSec % 60));
      setMinuteTimestamp((prev) => {
        if (nowMin !== prev) {
          // Minute rolled — if on suggestions screen, quietly regenerate
          return nowMin;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Auto-regenerate when the minute rolls while on suggestions screen
  useEffect(() => {
    if (step === "suggestions" && business && !loading) {
      generateSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteTimestamp]);

  // ── Load business from QR token ───────────────────────────────────────────
  useEffect(() => {
    if (!token || token === "demo") {
      setBusiness({
        _id: "demo",
        name: "The Artisan Café",
        category: "cafe",
        description: "A cozy neighbourhood café known for specialty coffee and homemade pastries.",
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
      });
      setSessionId("demo-" + Date.now());
      setInitialLoading(false);
      return;
    }

    (async () => {
      try {
        const res  = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid QR code");
        } else {
          setBusiness(data.business);
          setSessionId(data.sessionId);
        }
      } catch {
        setError("Failed to load business. Please try scanning again.");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [token]);

  // ── Generate / regenerate suggestions ────────────────────────────────────
  const generateSuggestions = useCallback(async () => {
    if (!business) return;
    setLoading(true);

    // Instant client-side preview while API call is in flight
    const seed     = buildClientSeed(business.name + business.description, rating, tone, minuteTimestamp);
    const preview  = Array.from({ length: 3 }, (_, i) => ({
      id:       String(i),
      text:     buildClientReview(business, rating, tone, seed, i),
      tone,
      rating,
      keywords: [] as string[],
    }));
    setSuggestions(preview);
    setSelectedIdx(0);
    setEditedText(preview[0].text);

    try {
      const res  = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId:      business._id === "demo" ? "000000000000000000000000" : business._id,
          rating,
          tone,
          keywords:        [],
          sessionId,
          minuteTimestamp, // ← server uses the same minute seed
        }),
      });
      const data = await res.json();
      if (res.ok && data.suggestions?.length) {
        setSuggestions(data.suggestions);
        setSelectedIdx(0);
        setEditedText(data.suggestions[0].text);
      }
      // else keep the client-generated preview
    } catch {
      // keep client preview — already shown above
    } finally {
      setLoading(false);
      setStep("suggestions");
    }
  }, [business, rating, tone, sessionId, minuteTimestamp]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleCopy() {
    await navigator.clipboard.writeText(editedText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleGoToGoogle() {
    if (!business) return;
    setRedirecting(true);

    const suggestion = suggestions[selectedIdx];
    if (suggestion?.dbId) {
      fetch("/api/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          dbId:        suggestion.dbId,
          finalText:   editedText,
          wasEdited:   editedText !== suggestion.text,
          sessionId,
          businessId:  business._id,
        }),
      }).catch(() => {});
    }

    await navigator.clipboard.writeText(editedText).catch(() => {});
    setTimeout(() => { window.location.href = business.googleReviewUrl; }, 800);
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading your review page…</p>
        </div>
      </div>
    );
  }

  // ── Error screen ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="glass rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="font-display text-xl font-bold text-white mb-2">Invalid QR Code</h2>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Redirecting overlay ───────────────────────────────────────────────────
  if (redirecting) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="text-center space-y-6 animate-fade-up max-w-sm w-full">
          <div className="w-20 h-20 bg-brand-500/15 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-brand-400" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Review copied! 🎉</h2>
            <p className="text-gray-400 text-sm">
              Taking you to Google now — just paste your review and hit submit!
            </p>
          </div>
          <div className="glass rounded-xl p-4 text-left border border-brand-500/30">
            <p className="text-gray-300 text-xs leading-relaxed italic">"{editedText}"</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
            <div className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" />
            Opening Google Reviews…
          </div>
          <a href={business?.googleReviewUrl} className="text-brand-400 text-xs underline underline-offset-2">
            Tap here if it doesn't open automatically
          </a>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface">
      <div className="fixed inset-0 bg-mesh-gradient pointer-events-none opacity-40" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-8 pb-16">

        {/* Business header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/25 text-brand-300 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3 h-3" /> AI review generator
          </div>
          <h1 className="font-display text-2xl font-bold text-white leading-tight">
            {business?.name}
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <MapPin className="w-3 h-3 text-gray-500" />
            <span className="text-gray-500 text-xs capitalize">{business?.category}</span>
          </div>
        </div>

        {/* ── STEP 1: Rating + Tone ── */}
        {step === "select" && (
          <div className="space-y-4 animate-fade-up">

            {/* Star rating */}
            <div className="glass rounded-2xl p-6">
              <p className="text-gray-400 text-sm font-medium text-center mb-5">
                How was your experience?
              </p>
              <div className="flex justify-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s as StarRating)}
                    onMouseEnter={() => setHoveredRating(s)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="star-btn"
                  >
                    <Star
                      className={`w-11 h-11 transition-all duration-100 ${
                        s <= (hoveredRating || rating)
                          ? "text-gold fill-gold scale-110"
                          : "text-gray-700 scale-100"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className={`text-center text-sm font-semibold transition-colors ${RATING_COLORS[rating]}`}>
                {RATING_LABELS[rating]}
              </p>
            </div>

            {/* Tone picker */}
            <div className="glass rounded-2xl p-5">
              <p className="text-gray-400 text-sm font-medium mb-4">
                How should your review sound?
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`p-3.5 rounded-xl border text-left transition-all duration-200 ${
                      tone === t.value
                        ? "bg-brand-500/15 border-brand-500 shadow-glow"
                        : "bg-surface-card border-surface-border hover:border-brand-500/40"
                    }`}
                  >
                    <div className="text-lg mb-1">{t.emoji}</div>
                    <div className={`text-sm font-semibold ${tone === t.value ? "text-white" : "text-gray-300"}`}>
                      {t.label}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh cadence hint */}
            <div className="flex items-center justify-center gap-2 text-gray-600 text-xs">
              <Clock className="w-3.5 h-3.5" />
              New suggestions every minute · next refresh in{" "}
              <span className="text-brand-400 font-mono font-semibold tabular-nums">
                {String(secsLeft).padStart(2, "0")}s
              </span>
            </div>

            {/* Generate button */}
            <button
              onClick={generateSuggestions}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating your review…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate My Review
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: Suggestions ── */}
        {step === "suggestions" && (
          <div className="space-y-4 animate-fade-up">

            {/* Summary bar */}
            <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s}
                    className={`w-4 h-4 ${s <= rating ? "text-gold fill-gold" : "text-gray-700"}`}
                  />
                ))}
                <span className={`ml-1 text-xs font-medium ${RATING_COLORS[rating]}`}>
                  {RATING_LABELS[rating]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">
                  {TONES.find((t) => t.value === tone)?.emoji}{" "}
                  {TONES.find((t) => t.value === tone)?.label}
                </span>
                <button
                  onClick={() => setStep("select")}
                  className="text-brand-400 text-xs hover:text-brand-300 flex items-center gap-0.5"
                >
                  <ArrowLeft className="w-3 h-3" /> Change
                </button>
              </div>
            </div>

            {/* Countdown + refresh */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                <Clock className="w-3.5 h-3.5" />
                New suggestions in{" "}
                <span className="text-brand-400 font-mono font-semibold tabular-nums">
                  {String(secsLeft).padStart(2, "0")}s
                </span>
              </div>
              <button
                onClick={generateSuggestions}
                disabled={loading}
                className="flex items-center gap-1.5 text-brand-400 text-xs hover:text-brand-300 disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh now
              </button>
            </div>

            {/* Suggestion cards */}
            <div className="glass rounded-2xl p-5">
              <p className="text-white text-sm font-semibold mb-4">Pick a review to use</p>

              <div className="space-y-2.5 mb-5">
                {suggestions.map((s, i) => (
                  <button
                    key={s.id || i}
                    onClick={() => {
                      setSelectedIdx(i);
                      setEditedText(s.text);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 text-sm leading-relaxed ${
                      selectedIdx === i
                        ? "bg-brand-500/10 border-brand-500 text-white"
                        : "bg-surface-card border-surface-border text-gray-400 hover:border-brand-500/40 hover:text-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selectedIdx === i ? "border-brand-500 bg-brand-500" : "border-gray-600"
                      }`}>
                        {selectedIdx === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span>{s.text}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Edit area */}
              <div className="border-t border-surface-border pt-4">
                <label className="text-gray-500 text-xs font-medium mb-2 block">
                  ✏️ Personalise before submitting (optional)
                </label>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={4}
                  className="w-full bg-surface border border-surface-border focus:border-brand-500 rounded-xl p-3 text-white text-sm leading-relaxed outline-none transition-colors"
                  placeholder="Edit your review here…"
                />
              </div>
            </div>

            {/* CTAs */}
            <button
              onClick={handleGoToGoogle}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
            >
              <ExternalLink className="w-4 h-4" />
              Copy & Open Google Reviews
            </button>

            <button
              onClick={handleCopy}
              className="btn-secondary w-full flex items-center justify-center gap-2 py-3 text-sm"
            >
              {copied
                ? <><Check className="w-4 h-4 text-brand-400" /> Copied to clipboard!</>
                : <><Copy className="w-4 h-4" /> Copy text only</>
              }
            </button>

            {/* Paste instruction */}
            <div className="glass rounded-xl p-4 border border-surface-border">
              <p className="text-gray-500 text-xs leading-relaxed text-center">
                <span className="text-gray-300 font-medium">How it works:</span> Your review text is copied
                automatically. When Google opens, just{" "}
                <strong className="text-gray-300">paste</strong> it into the review box and{" "}
                <strong className="text-gray-300">tap Submit</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

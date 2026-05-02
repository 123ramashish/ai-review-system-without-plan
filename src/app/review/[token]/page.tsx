"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Star, Copy, Check, ExternalLink, Sparkles,
  RefreshCw, ChevronRight, ArrowLeft, MapPin, Clock, Languages,
} from "lucide-react";
import {
  FeedbackTone,
  StarRating,
  GeneratedSuggestion,
  ReviewLanguage,
  REVIEW_LANGUAGE_OPTIONS,
} from "@/types";
import { buildClientPreviewReview } from "@/lib/ai-generator";

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

export default function ReviewPage() {
  const params  = useParams();
  const token   = params.token as string;

  const [step,            setStep]            = useState<Step>("select");
  const [business,        setBusiness]        = useState<BusinessInfo | null>(null);
  const [sessionId,       setSessionId]       = useState<string>("");
  const [rating,          setRating]          = useState<StarRating>(5);
  const [hoveredRating,   setHoveredRating]   = useState<number>(0);
  const [tone,            setTone]            = useState<FeedbackTone>("enthusiastic");
  const [reviewLanguage,  setReviewLanguage]  = useState<ReviewLanguage>("hinglish");
  const [suggestions,     setSuggestions]     = useState<(GeneratedSuggestion & { dbId?: string })[]>([]);
  const [selectedIdx,     setSelectedIdx]     = useState<number>(0);
  const [editedText,      setEditedText]      = useState<string>("");
  const [loading,         setLoading]         = useState(false);
  const [initialLoading,  setInitialLoading]  = useState(true);
  const [copied,          setCopied]          = useState(false);
  const [redirecting,     setRedirecting]     = useState(false);
  const [copySuccess,     setCopySuccess]     = useState(false);
  const [autoFilled,      setAutoFilled]      = useState(false);
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
  const generateSuggestions = useCallback(
    async (forcedLanguage?: ReviewLanguage) => {
      if (!business) return;
      const language = forcedLanguage ?? reviewLanguage;
      setLoading(true);

      const preview = Array.from({ length: 3 }, (_, i) => ({
        id: String(i),
        text: buildClientPreviewReview(
          business,
          rating,
          tone,
          [],
          minuteTimestamp,
          i,
          language
        ),
        tone,
        rating,
        keywords: [] as string[],
      }));
      setSuggestions(preview);
      setSelectedIdx(0);
      setEditedText(preview[0].text);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId: business._id === "demo" ? "000000000000000000000000" : business._id,
            rating,
            tone,
            reviewLanguage: language,
            keywords: [],
            sessionId,
            minuteTimestamp,
          }),
        });
        const data = await res.json();
        if (res.ok && data.suggestions?.length) {
          setSuggestions(data.suggestions);
          setSelectedIdx(0);
          setEditedText(data.suggestions[0].text);
        }
      } catch {
        /* keep client preview */
      } finally {
        setLoading(false);
        setStep("suggestions");
      }
    },
    [business, rating, tone, reviewLanguage, sessionId, minuteTimestamp]
  );

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

    // Always copy to clipboard as backup
    const didCopy = await navigator.clipboard.writeText(editedText).then(() => true).catch(() => false);
    setCopySuccess(didCopy);

    // Try the local Selenium automation server first (http://localhost:5175)
    // If it's running, it opens Chrome with the user's Google session and auto-fills.
    try {
      const res = await fetch("http://localhost:5175/fill-review", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          url:        business.googleReviewUrl,
          text:       editedText,
          stars:      rating,
          autoSubmit: false,
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      if (data.ok) {
        setAutoFilled(true);
        return; // Selenium handled it — don't redirect the current tab
      }
    } catch {
      // Local server not running — fall back to clipboard + redirect
    }

    setTimeout(() => { window.location.href = business.googleReviewUrl; }, 2500);
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
    // ── Auto-filled by Selenium server ──────────────────────────────────────
    if (autoFilled) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-6">
          <div className="text-center space-y-5 animate-fade-up max-w-sm w-full">
            <div className="w-20 h-20 bg-brand-500/15 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-brand-400" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white mb-2">Review auto-filled! 🎉</h2>
              <p className="text-gray-400 text-sm">
                Your review text and {rating} star{rating !== 1 ? "s" : ""} have been filled in
                automatically. Just click <strong className="text-white">Post</strong> in Chrome to submit.
              </p>
            </div>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-7 h-7 ${s <= rating ? "text-gold fill-gold" : "text-gray-700"}`} />
              ))}
            </div>
            <div className="glass rounded-xl p-4 border border-brand-500/30 text-left">
              <p className="text-gray-400 text-xs mb-1">Filled review:</p>
              <p className="text-gray-300 text-xs leading-relaxed italic">"{editedText}"</p>
            </div>
            <button
              onClick={() => { setRedirecting(false); setAutoFilled(false); }}
              className="btn-secondary w-full text-sm"
            >
              Back
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-8">
        <div className="space-y-4 animate-fade-up max-w-sm w-full">

          <div className="text-center">
            <div className="w-16 h-16 bg-brand-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8 text-brand-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Opening Google Reviews</h2>
            <p className="text-gray-400 text-sm mt-1">Follow these steps when Google opens:</p>
          </div>

          {/* Step-by-step guide */}
          <div className="glass rounded-xl p-4 space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-brand-300 text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Tap {rating} star{rating !== 1 ? "s" : ""}</p>
                <div className="flex gap-0.5 mt-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-6 h-6 ${s <= rating ? "text-gold fill-gold" : "text-gray-600"}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-brand-300 text-xs font-bold">2</span>
              </div>
              <p className="text-white text-sm font-semibold mt-0.5">Tap the review text box</p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-brand-300 text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Paste your review</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Mobile: long-press → <span className="text-gray-300 font-medium">Paste</span>
                  {"  ·  "}
                  Desktop: <span className="text-gray-300 font-mono font-medium">Ctrl+V</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-brand-300 text-xs font-bold">4</span>
              </div>
              <p className="text-white text-sm font-semibold mt-0.5">
                Tap <span className="text-brand-400">Post</span> to submit
              </p>
            </div>
          </div>

          {/* Copied text preview */}
          <div className={`glass rounded-xl p-4 border ${copySuccess ? "border-brand-500/30" : "border-yellow-500/30"}`}>
            {copySuccess ? (
              <div className="flex items-center gap-1.5 mb-2">
                <Check className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-brand-400 text-xs font-semibold">Copied to clipboard</span>
              </div>
            ) : (
              <p className="text-yellow-400 text-xs font-semibold mb-2">
                ⚠️ Clipboard blocked — select and copy the text below:
              </p>
            )}
            <p className="text-gray-300 text-xs leading-relaxed italic select-all">"{editedText}"</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
            <div className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" />
            Opening Google Reviews…
          </div>
          <a href={business?.googleReviewUrl} className="block text-center text-brand-400 text-xs underline underline-offset-2">
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

      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-5 pt-6 sm:pt-8 pb-20 safe-area-pb">

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

            {/* Review language */}
            <div className="glass rounded-2xl p-5">
              <p className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
                <Languages className="w-4 h-4 text-brand-400 flex-shrink-0" />
                Review language
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {REVIEW_LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={loading}
                    onClick={() => setReviewLanguage(opt.value)}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 disabled:opacity-50 ${
                      reviewLanguage === opt.value
                        ? "bg-brand-500/15 border-brand-500 shadow-glow"
                        : "bg-surface-card border-surface-border hover:border-brand-500/40"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${reviewLanguage === opt.value ? "text-white" : "text-gray-300"}`}>
                      {opt.label}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">{opt.hint}</div>
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
              type="button"
              onClick={() => void generateSuggestions()}
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
            <div className="glass rounded-xl px-3 sm:px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1 flex-wrap">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s}
                    className={`w-4 h-4 ${s <= rating ? "text-gold fill-gold" : "text-gray-700"}`}
                  />
                ))}
                <span className={`ml-1 text-xs font-medium ${RATING_COLORS[rating]}`}>
                  {RATING_LABELS[rating]}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <span className="text-gray-500 text-xs truncate">
                  {TONES.find((t) => t.value === tone)?.emoji}{" "}
                  {TONES.find((t) => t.value === tone)?.label}
                </span>
                <button
                  onClick={() => setStep("select")}
                  className="text-brand-400 text-xs hover:text-brand-300 flex items-center gap-0.5 flex-shrink-0"
                >
                  <ArrowLeft className="w-3 h-3" /> Change
                </button>
              </div>
            </div>

            {/* Countdown + refresh */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs justify-center sm:justify-start">
                <Clock className="w-3.5 h-3.5" />
                New suggestions in{" "}
                <span className="text-brand-400 font-mono font-semibold tabular-nums">
                  {String(secsLeft).padStart(2, "0")}s
                </span>
              </div>
              <button
                type="button"
                onClick={() => void generateSuggestions()}
                disabled={loading}
                className="flex items-center justify-center sm:justify-end gap-1.5 text-brand-400 text-xs hover:text-brand-300 disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh now
              </button>
            </div>

            <div className="glass rounded-xl px-3 py-3 border border-surface-border">
              <p className="text-gray-500 text-xs font-medium mb-2 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-brand-400" />
                Language
              </p>
              <div className="flex flex-wrap gap-2">
                {REVIEW_LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (opt.value === reviewLanguage) return;
                      setReviewLanguage(opt.value);
                      void generateSuggestions(opt.value);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${
                      reviewLanguage === opt.value
                        ? "bg-brand-500/20 border-brand-500 text-brand-300"
                        : "bg-surface-card border-surface-border text-gray-400 hover:border-brand-500/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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

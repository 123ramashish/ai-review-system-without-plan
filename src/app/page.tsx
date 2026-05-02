"use client";

import Link from "next/link";
import { Star, QrCode, Sparkles, TrendingUp, ArrowRight, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface overflow-hidden">
      {/* Background mesh */}
      <div className="fixed inset-0 bg-mesh-gradient pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse_soft" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/5 rounded-full blur-3xl animate-pulse_soft" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-6xl mx-auto safe-area-pt">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-display font-bold text-lg sm:text-xl text-white truncate">ReviewGenius</span>
        </div>
        <Link
          href="/dashboard"
          className="btn-secondary text-sm px-4 py-2.5 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          Dashboard <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 text-brand-300 text-sm font-medium px-4 py-2 rounded-full mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Review Generation
        </div>

        <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold text-white leading-tight mb-6 animate-fade-up">
          Turn Every Customer
          <br />
          Into a <span className="gradient-text">5-Star Review</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-gray-400 leading-relaxed mb-10 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.1s" }}>
          Generate unique, authentic Google Business review text with AI.
          Customers scan your QR code, choose their feedback style, and submit
          a genuine review in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <Link href="/dashboard" className="btn-primary flex items-center gap-2 text-base">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/review/demo"
            className="btn-secondary flex items-center gap-2 text-base"
          >
            <QrCode className="w-4 h-4" /> Try Demo Flow
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-4 sm:px-6 py-14 sm:py-20 max-w-6xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-white mb-4">
          How It Works
        </h2>
        <p className="text-gray-400 text-center mb-14 max-w-xl mx-auto">
          Three simple steps to get authentic reviews from happy customers.
        </p>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              icon: QrCode,
              step: "01",
              title: "Create & Print QR Code",
              desc: "Add your business, and we'll generate a unique QR code to display at your counter, table, or entrance.",
              color: "brand",
            },
            {
              icon: Sparkles,
              step: "02",
              title: "Customer Scans & Gets Suggestions",
              desc: "When customers scan the QR, they instantly see AI-generated review text tailored to their rating and tone preference.",
              color: "gold",
            },
            {
              icon: TrendingUp,
              step: "03",
              title: "One-Tap Google Submission",
              desc: "The customer copies or edits the text, then taps to open Google Reviews with one click. Done in seconds.",
              color: "brand",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-6 group hover:border-brand-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-${item.color === "gold" ? "gold" : "brand-500"}/15 flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.color === "gold" ? "text-gold" : "text-brand-400"}`} />
                </div>
                <span className="font-mono text-4xl font-bold text-white/5 select-none">{item.step}</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 max-w-6xl mx-auto">
        <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 border border-brand-500/20">
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-6">
                Why ReviewGenius?
              </h2>
              <div className="space-y-4">
                {[
                  "AI generates 3 unique suggestions per scan — never the same review twice",
                  "Customers can edit and personalize before submitting",
                  "Supports all tones: enthusiastic, professional, casual, detailed",
                  "Track scans, submissions, and conversion rates in your dashboard",
                  "Works for any business category: restaurants, salons, gyms, and more",
                  "QR code downloads as high-res PNG for easy printing",
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock phone preview */}
            <div className="flex justify-center">
              <div className="w-64 bg-ink-soft rounded-3xl border border-surface-border p-4 shadow-card-hover animate-float">
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-6 h-6 ${s <= 5 ? "text-gold fill-gold" : "text-gray-600"}`}
                      />
                    ))}
                  </div>
                  <div className="h-2 bg-surface-border rounded shimmer" />
                  <div className="h-16 bg-surface-border/50 rounded-xl border border-brand-500/30 p-2">
                    <div className="h-1.5 bg-brand-500/40 rounded w-3/4 mb-1.5" />
                    <div className="h-1.5 bg-brand-500/40 rounded w-full mb-1.5" />
                    <div className="h-1.5 bg-brand-500/40 rounded w-2/3" />
                  </div>
                  <div className="h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">Submit to Google ★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 text-center px-4 sm:px-6 py-14 sm:py-20 safe-area-pb">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to boost your reviews?
        </h2>
        <p className="text-gray-400 mb-8">
          Set up your first business in under 2 minutes.
        </p>
        <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 text-base">
          Open Dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-border px-4 sm:px-6 py-6 sm:py-8 text-center">
        <p className="text-gray-600 text-sm">
          ReviewGenius — AI-powered Google Business Review Generation
        </p>
      </footer>
    </main>
  );
}

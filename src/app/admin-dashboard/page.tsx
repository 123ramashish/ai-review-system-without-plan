"use client";

import { useState, useEffect } from "react";
import { QrCode, Star, TrendingUp, Download, ExternalLink, BarChart3, Store, LogOut, CreditCard } from "lucide-react";
import Link from "next/link";

interface Business {
  _id: string;
  name: string;
  description: string;
  category: string;
  googleReviewUrl: string;
  qrCode?: string;
  qrToken: string;
  totalScans: number;
  totalSubmissions: number;
  subscriptionStatus: string;
  subscriptionAmount: number;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<Business | null>(null);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function fetchBusiness() {
    try {
      const res = await fetch("/api/admin/business");
      const data = await res.json();
      if (res.ok) {
        setBusiness(data.business);
      }
    } catch (error) {
      console.error("Failed to fetch business:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBusiness();
  }, []);

  function downloadQR(b: Business) {
    if (!b.qrCode) return;
    const link = document.createElement("a");
    link.href = b.qrCode;
    link.download = `qr-${b.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
  }

  const conversionRate = business && business.totalScans > 0 
    ? Math.round((business.totalSubmissions / business.totalScans) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-surface">
      <div className="fixed inset-0 bg-mesh-gradient pointer-events-none opacity-30" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-surface-border px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <span className="font-display font-bold text-white">ReviewGenius</span>
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-gray-400 text-sm">Business Portal</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          {loading ? (
            <div className="space-y-4">
              <div className="glass rounded-2xl h-64 shimmer" />
            </div>
          ) : !business ? (
            <div className="glass rounded-2xl p-16 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Business Not Found</h3>
              <p className="text-gray-400 text-sm mb-6">We couldn't load your business data.</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                  { label: "Total Scans", value: business.totalScans, icon: QrCode, color: "brand" },
                  { label: "Submissions", value: business.totalSubmissions, icon: TrendingUp, color: "gold" },
                  { label: "Conversion", value: `${conversionRate}%`, icon: BarChart3, color: "gold" },
                  { label: "Status", value: business.subscriptionStatus === "active" ? "Active" : "Inactive", icon: CreditCard, color: business.subscriptionStatus === "active" ? "brand" : "gold" },
                ].map((stat, i) => (
                  <div key={i} className="glass rounded-xl p-4">
                    <div className={`w-8 h-8 rounded-lg ${stat.color === "gold" ? "bg-gold/10" : "bg-brand-500/10"} flex items-center justify-center mb-3`}>
                      <stat.icon className={`w-4 h-4 ${stat.color === "gold" ? "text-gold" : "text-brand-400"}`} />
                    </div>
                    <div className="font-display text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Business details */}
              <div className="glass rounded-2xl p-8 hover:border-brand-500/30 transition-all duration-200">
                <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display text-3xl font-bold text-white">{business.name}</h3>
                      <span className="bg-brand-500/10 text-brand-300 text-xs px-3 py-1 rounded-full capitalize flex-shrink-0 font-medium">
                        {business.category}
                      </span>
                    </div>
                    <p className="text-gray-400 text-base mb-6 leading-relaxed">{business.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span className={`flex items-center gap-2 ${business.subscriptionStatus === 'active' ? 'text-green-400' : 'text-red-400'} font-medium`}>
                        <CreditCard className="w-4 h-4" />
                        Subscription: {business.subscriptionStatus === 'active' ? 'Active' : 'Inactive'} ({business.subscriptionAmount || 1000}/mo)
                      </span>
                    </div>
                    
                    <div className="mt-8 flex items-center gap-4">
                      <Link
                        href={`/review/${business.qrToken}`}
                        target="_blank"
                        className="btn-secondary flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" /> Preview Live Page
                      </Link>
                      <button
                        onClick={() => setSelectedQR(business)}
                        className="btn-primary flex items-center gap-2"
                      >
                        <QrCode className="w-4 h-4" /> Show QR Code
                      </button>
                    </div>
                  </div>

                  {business.qrCode && (
                    <div className="flex flex-col items-center gap-4 bg-surface-card p-6 rounded-2xl border border-surface-border">
                      <div className="bg-white p-3 rounded-xl inline-block shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={business.qrCode}
                          alt="QR Code"
                          className="w-40 h-40"
                        />
                      </div>
                      <button
                        onClick={() => downloadQR(business)}
                        className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                      >
                        <Download className="w-4 h-4" /> Download QR
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* QR Code Modal */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedQR(null)} />
          <div className="relative glass rounded-2xl p-8 w-full max-w-sm text-center animate-fade-up">
            <h2 className="font-display text-xl font-bold text-white mb-2">{selectedQR.name}</h2>
            <p className="text-gray-400 text-sm mb-6">Scan to leave a review</p>
            {selectedQR.qrCode ? (
              <div className="bg-white p-4 rounded-xl inline-block mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedQR.qrCode}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
            ) : (
              <div className="w-56 h-56 bg-gray-200 rounded-xl mx-auto mb-6 flex items-center justify-center">
                <QrCode className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <div className="bg-surface-card rounded-lg px-3 py-2 mb-6">
              <p className="font-mono text-xs text-gray-400 break-all">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/review/${selectedQR.qrToken}`
                  : `/review/${selectedQR.qrToken}`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedQR(null)}
                className="btn-secondary flex-1 text-sm"
              >
                Close
              </button>
              {selectedQR.qrCode && (
                <button
                  onClick={() => downloadQR(selectedQR)}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

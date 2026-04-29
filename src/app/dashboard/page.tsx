"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, QrCode, Star, TrendingUp, Download, Trash2, ExternalLink, BarChart3, Store, LogOut, User } from "lucide-react";
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
  createdAt: string;
}

const CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "retail", label: "Retail" },
  { value: "hotel", label: "Hotel" },
  { value: "salon", label: "Salon" },
  { value: "gym", label: "Gym" },
  { value: "medical", label: "Medical" },
  { value: "automotive", label: "Automotive" },
  { value: "services", label: "Services" },
  { value: "other", label: "Other" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "restaurant",
    googleReviewUrl: "",
    ownerId: "",
  });
  const [creating, setCreating] = useState(false);
  const [selectedQR, setSelectedQR] = useState<Business | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    // Only super admin can add businesses
    if (session.user.role !== "super_admin") {
      setShowModal(false);
    }

    fetchBusinesses();
  }, [session, status, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setBusinesses((prev) => [data.business, ...prev]);
        setShowModal(false);
        setFormData({ name: "", description: "", category: "restaurant", googleReviewUrl: "" });
      }
    } catch (error) {
      console.error("Failed to create business:", error);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this business and all its QR data?")) return;
    await fetch(`/api/businesses/${id}`, { method: "DELETE" });
    setBusinesses((prev) => prev.filter((b) => b._id !== id));
  }

  function downloadQR(business: Business) {
    if (!business.qrCode) return;
    const link = document.createElement("a");
    link.href = business.qrCode;
    link.download = `qr-${business.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
  }

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const totalScans = businesses.reduce((sum, b) => sum + b.totalScans, 0);
  const totalSubmissions = businesses.reduce((sum, b) => sum + b.totalSubmissions, 0);
  const conversionRate = totalScans > 0 ? Math.round((totalSubmissions / totalScans) * 100) : 0;

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
              <span className="text-gray-400 text-sm">Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              {session?.user.role === "super_admin" && (
                <Link href="/admin" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <User className="w-4 h-4" />
                {session?.user.companyName || session?.user.email}
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Businesses", value: businesses.length, icon: Store, color: "brand" },
              { label: "Total Scans", value: totalScans, icon: QrCode, color: "brand" },
              { label: "Submissions", value: totalSubmissions, icon: TrendingUp, color: "gold" },
              { label: "Conversion", value: `${conversionRate}%`, icon: BarChart3, color: "gold" },
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

          {/* Businesses list */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-2xl h-28 shimmer" />
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center">
              <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store className="w-7 h-7 text-brand-400" />
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-2">No businesses yet</h3>
              <p className="text-gray-400 text-sm mb-6">Add your first business to generate QR codes and start collecting reviews.</p>
              <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add First Business
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {businesses.map((business) => (
                <div key={business._id} className="glass rounded-2xl p-6 hover:border-brand-500/30 transition-all duration-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-lg font-bold text-white truncate">{business.name}</h3>
                        <span className="bg-brand-500/10 text-brand-300 text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0">
                          {business.category}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm truncate mb-3">{business.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5" />
                          {business.totalScans} scans
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" />
                          {business.totalSubmissions} reviews
                        </span>
                        {business.totalScans > 0 && (
                          <span className="text-brand-400">
                            {Math.round((business.totalSubmissions / business.totalScans) * 100)}% converted
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/review/${business.qrToken}`}
                        target="_blank"
                        className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Preview
                      </Link>
                      <button
                        onClick={() => setSelectedQR(business)}
                        className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5" /> QR Code
                      </button>
                      <button
                        onClick={() => handleDelete(business._id)}
                        className="p-2 rounded-lg border border-surface-border hover:border-red-500/50 hover:text-red-400 text-gray-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Add Business Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass rounded-2xl p-8 w-full max-w-md animate-fade-up">
            <h2 className="font-display text-xl font-bold text-white mb-6">Add New Business</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Business Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="The Artisan Café"
                  required
                  className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A cozy neighborhood café known for specialty coffee and homemade pastries..."
                  required
                  rows={3}
                  className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Google Review URL</label>
                <input
                  type="url"
                  value={formData.googleReviewUrl}
                  onChange={(e) => setFormData({ ...formData, googleReviewUrl: e.target.value })}
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  required
                  className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                />
                <p className="text-gray-600 text-xs mt-1">Find this in Google Maps → Share → Write a review</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creating ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Create</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

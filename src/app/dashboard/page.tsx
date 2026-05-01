"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus, QrCode, Star, TrendingUp, Download, Trash2,
  ExternalLink, BarChart3, Store, LogOut, CreditCard,
  Edit, AlertTriangle, CheckCircle, XCircle, Clock,
  DollarSign, Calendar,
} from "lucide-react";
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
  subscriptionStatus: "active" | "past_due" | "canceled";
  subscriptionAmount: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  createdAt: string;
}

type FilterTab = "all" | "active" | "expiring" | "inactive";

const CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe",       label: "Café" },
  { value: "retail",     label: "Retail" },
  { value: "hotel",      label: "Hotel" },
  { value: "salon",      label: "Salon" },
  { value: "gym",        label: "Gym" },
  { value: "medical",    label: "Medical" },
  { value: "automotive", label: "Automotive" },
  { value: "services",   label: "Services" },
  { value: "other",      label: "Other" },
];

function daysUntilExpiry(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

function isExpiringSoon(b: Business): boolean {
  if (!b.subscriptionEndDate || b.subscriptionStatus !== "active") return false;
  const d = daysUntilExpiry(b.subscriptionEndDate);
  return d >= 0 && d <= 7;
}

function isInactive(b: Business): boolean {
  return b.subscriptionStatus === "past_due" || b.subscriptionStatus === "canceled";
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function toInputDate(dateStr: string): string {
  return new Date(dateStr).toISOString().split("T")[0];
}

const EMPTY_FORM = {
  name: "", description: "", category: "restaurant",
  googleReviewUrl: "", adminEmail: "", adminPassword: "",
  subscriptionStatus: "active", subscriptionAmount: 1000,
  subscriptionEndDate: "",
};

export default function DashboardPage() {
  const [businesses,      setBusinesses]      = useState<Business[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [activeTab,       setActiveTab]       = useState<FilterTab>("all");
  const [showModal,       setShowModal]       = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [selectedQR,      setSelectedQR]      = useState<Business | null>(null);
  const [saving,          setSaving]          = useState(false);
  const [formData,        setFormData]        = useState({ ...EMPTY_FORM });

  function set(patch: Partial<typeof EMPTY_FORM>) {
    setFormData((f) => ({ ...f, ...patch }));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function fetchBusinesses() {
    try {
      const res  = await fetch("/api/businesses");
      const data = await res.json();
      setBusinesses(data.businesses || []);
    } catch (err) {
      console.error("Failed to fetch businesses:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBusinesses(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res  = await fetch("/api/businesses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setBusinesses((prev) => [data.business, ...prev]);
        setShowModal(false);
        setFormData({ ...EMPTY_FORM });
      } else {
        alert(data.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBusiness) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/businesses/${editingBusiness._id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:                formData.name,
          description:         formData.description,
          category:            formData.category,
          googleReviewUrl:     formData.googleReviewUrl,
          subscriptionStatus:  formData.subscriptionStatus,
          subscriptionAmount:  formData.subscriptionAmount,
          subscriptionEndDate: formData.subscriptionEndDate || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBusinesses((prev) =>
          prev.map((b) => (b._id === editingBusiness._id ? data.business : b))
        );
        setEditingBusiness(null);
      } else {
        alert(data.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this business and all its QR data?")) return;
    await fetch(`/api/businesses/${id}`, { method: "DELETE" });
    setBusinesses((prev) => prev.filter((b) => b._id !== id));
  }

  function downloadQR(b: Business) {
    if (!b.qrCode) return;
    const a = document.createElement("a");
    a.href = b.qrCode;
    a.download = `qr-${b.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  function openEdit(b: Business) {
    setEditingBusiness(b);
    setFormData({
      name:               b.name,
      description:        b.description,
      category:           b.category,
      googleReviewUrl:    b.googleReviewUrl,
      adminEmail:         "",
      adminPassword:      "",
      subscriptionStatus: b.subscriptionStatus,
      subscriptionAmount: b.subscriptionAmount,
      subscriptionEndDate: b.subscriptionEndDate ? toInputDate(b.subscriptionEndDate) : "",
    });
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeList   = businesses.filter((b) => b.subscriptionStatus === "active");
    const expiringList = businesses.filter(isExpiringSoon);
    const inactiveList = businesses.filter(isInactive);
    const revenue      = activeList.reduce((s, b) => s + (b.subscriptionAmount || 0), 0);
    const totalScans   = businesses.reduce((s, b) => s + b.totalScans, 0);
    const totalReviews = businesses.reduce((s, b) => s + b.totalSubmissions, 0);
    const conversion   = totalScans > 0 ? Math.round((totalReviews / totalScans) * 100) : 0;
    return { activeList, expiringList, inactiveList, revenue, totalScans, totalReviews, conversion };
  }, [businesses]);

  const filtered = useMemo(() => {
    if (activeTab === "active")   return businesses.filter((b) => b.subscriptionStatus === "active" && !isExpiringSoon(b));
    if (activeTab === "expiring") return stats.expiringList;
    if (activeTab === "inactive") return stats.inactiveList;
    return businesses;
  }, [businesses, activeTab, stats]);

  const tabs: { key: FilterTab; label: string; count: number; activeColor: string }[] = [
    { key: "all",      label: "All Businesses", count: businesses.length,         activeColor: "text-white" },
    { key: "active",   label: "Active",         count: stats.activeList.length,   activeColor: "text-green-400" },
    { key: "expiring", label: "Expiring Soon",  count: stats.expiringList.length, activeColor: "text-amber-400" },
    { key: "inactive", label: "Inactive",       count: stats.inactiveList.length, activeColor: "text-red-400" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface">
      <div className="fixed inset-0 bg-mesh-gradient pointer-events-none opacity-30" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-surface-border px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <span className="font-display font-bold text-white">ReviewGenius</span>
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-gray-400 text-sm">Super Admin</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowModal(true); setFormData({ ...EMPTY_FORM }); }}
                className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
              >
                <Plus className="w-4 h-4" /> Add Business
              </button>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

          {/* ── Subscription overview ─────────────────────────────────── */}
          <section>
            <h2 className="text-white font-display font-semibold text-base mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-400" />
              Subscription Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                {
                  label: "Total Businesses", value: businesses.length,
                  sub: "registered", icon: Store,
                  bg: "bg-brand-500/10", fg: "text-brand-400",
                },
                {
                  label: "Active", value: stats.activeList.length,
                  sub: "subscriptions", icon: CheckCircle,
                  bg: "bg-green-500/10", fg: "text-green-400",
                  border: stats.activeList.length > 0 ? "border-green-500/20" : "",
                },
                {
                  label: "Expiring in 7 days", value: stats.expiringList.length,
                  sub: "need renewal", icon: Clock,
                  bg: "bg-amber-500/10", fg: "text-amber-400",
                  border: stats.expiringList.length > 0 ? "border-amber-500/30" : "",
                  pulse: stats.expiringList.length > 0,
                },
                {
                  label: "Inactive", value: stats.inactiveList.length,
                  sub: "past due / canceled", icon: XCircle,
                  bg: "bg-red-500/10", fg: "text-red-400",
                  border: stats.inactiveList.length > 0 ? "border-red-500/20" : "",
                },
                {
                  label: "Monthly Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`,
                  sub: "from active subs", icon: DollarSign,
                  bg: "bg-gold/10", fg: "text-gold",
                },
              ].map((s, i) => (
                <div key={i} className={`glass rounded-xl p-4 border ${s.border ?? "border-transparent"} transition-all`}>
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3 ${s.pulse ? "animate-pulse" : ""}`}>
                    <s.icon className={`w-4 h-4 ${s.fg}`} />
                  </div>
                  <div className="font-display text-2xl font-bold text-white">{s.value}</div>
                  <div className={`text-xs font-semibold mt-0.5 ${s.fg}`}>{s.label}</div>
                  <div className="text-gray-600 text-xs mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Engagement row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total QR Scans",  value: stats.totalScans,   icon: QrCode,   color: "brand" },
              { label: "Reviews Collected", value: stats.totalReviews, icon: TrendingUp, color: "gold" },
              { label: "Avg Conversion",  value: `${stats.conversion}%`, icon: BarChart3, color: "gold" },
            ].map((s, i) => (
              <div key={i} className="glass rounded-xl p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color === "gold" ? "bg-gold/10" : "bg-brand-500/10"}`}>
                  <s.icon className={`w-5 h-5 ${s.color === "gold" ? "text-gold" : "text-brand-400"}`} />
                </div>
                <div>
                  <div className="font-display text-xl font-bold text-white">{s.value}</div>
                  <div className="text-gray-500 text-xs">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Expiring-soon alert banner ───────────────────────────── */}
          {stats.expiringList.length > 0 && (
            <div className="glass rounded-xl p-4 border border-amber-500/40 bg-amber-500/5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-amber-300 font-semibold text-sm">
                  {stats.expiringList.length} subscription{stats.expiringList.length > 1 ? "s" : ""} expiring within 7 days
                </p>
                <p className="text-amber-500/80 text-xs mt-1 truncate">
                  {stats.expiringList.map((b) => {
                    const d = daysUntilExpiry(b.subscriptionEndDate!);
                    return `${b.name} (${d}d)`;
                  }).join("  ·  ")}
                </p>
              </div>
              <button
                onClick={() => setActiveTab("expiring")}
                className="text-amber-400 text-xs font-semibold hover:text-amber-300 flex-shrink-0 whitespace-nowrap"
              >
                View all →
              </button>
            </div>
          )}

          {/* ── Filter tabs + list ───────────────────────────────────── */}
          <section>
            {/* Tabs */}
            <div className="flex items-center gap-0.5 border-b border-surface-border mb-5">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-2 -mb-px border-b-2 rounded-t-lg ${
                    activeTab === tab.key
                      ? `border-brand-500 ${tab.activeColor} bg-brand-500/5`
                      : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key
                        ? "bg-brand-500/20 text-brand-300"
                        : "bg-surface-card text-gray-500"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="glass rounded-xl h-24 shimmer" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass rounded-2xl p-14 text-center">
                <div className="w-12 h-12 bg-surface-card rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Store className="w-6 h-6 text-gray-600" />
                </div>
                <p className="text-gray-400 text-sm">
                  {activeTab === "all"      ? "No businesses yet." :
                   activeTab === "expiring" ? "No subscriptions expiring within 7 days." :
                   activeTab === "inactive" ? "All subscriptions are currently active." :
                   "No active subscriptions found."}
                </p>
                {activeTab === "all" && (
                  <button
                    onClick={() => { setShowModal(true); setFormData({ ...EMPTY_FORM }); }}
                    className="btn-primary inline-flex items-center gap-2 mt-5"
                  >
                    <Plus className="w-4 h-4" /> Add First Business
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((b) => {
                  const expiring = isExpiringSoon(b);
                  const inactive = isInactive(b);
                  const days     = b.subscriptionEndDate ? daysUntilExpiry(b.subscriptionEndDate) : null;
                  const convRate = b.totalScans > 0
                    ? Math.round((b.totalSubmissions / b.totalScans) * 100) : 0;

                  return (
                    <div
                      key={b._id}
                      className={`glass rounded-xl p-5 transition-all duration-200 ${
                        expiring ? "border-amber-500/35 hover:border-amber-500/55 bg-amber-500/[0.02]" :
                        inactive ? "border-red-500/20  hover:border-red-500/40  opacity-80" :
                        "hover:border-brand-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">

                          {/* Name + status badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-display text-base font-bold text-white">{b.name}</h3>
                            <span className="bg-brand-500/10 text-brand-300 text-xs px-2 py-0.5 rounded-full capitalize">
                              {b.category}
                            </span>

                            {b.subscriptionStatus === "active" && !expiring && (
                              <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Active
                              </span>
                            )}
                            {expiring && (
                              <span className="bg-amber-500/15 text-amber-400 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold">
                                <Clock className="w-3 h-3" />
                                {days === 0 ? "Expires today!" : `Expires in ${days}d`}
                              </span>
                            )}
                            {b.subscriptionStatus === "past_due" && (
                              <span className="bg-orange-500/10 text-orange-400 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Past Due
                              </span>
                            )}
                            {b.subscriptionStatus === "canceled" && (
                              <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Canceled
                              </span>
                            )}
                          </div>

                          <p className="text-gray-500 text-xs truncate mb-3">{b.description}</p>

                          {/* Subscription + engagement details */}
                          <div className="flex items-center gap-4 text-xs flex-wrap">
                            <span className="flex items-center gap-1.5 text-gray-400">
                              <CreditCard className="w-3.5 h-3.5" />
                              ₹{(b.subscriptionAmount || 1000).toLocaleString("en-IN")}/mo
                            </span>

                            {b.subscriptionEndDate ? (
                              <span className={`flex items-center gap-1.5 ${expiring ? "text-amber-400 font-semibold" : "text-gray-500"}`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {days !== null && days < 0
                                  ? <span className="text-red-400">Expired {fmtDate(b.subscriptionEndDate)}</span>
                                  : <>Ends {fmtDate(b.subscriptionEndDate)}</>
                                }
                                {days !== null && days >= 0 && (
                                  <span className={`ml-0.5 font-bold ${days <= 3 ? "text-red-400" : "text-amber-400"}`}>
                                    · {days}d left
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-600 text-xs flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> No end date set
                              </span>
                            )}

                            <span className="border-l border-surface-border pl-4 flex items-center gap-1.5 text-gray-600">
                              <QrCode className="w-3.5 h-3.5" /> {b.totalScans} scans
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-600">
                              <Star className="w-3.5 h-3.5" /> {b.totalSubmissions} reviews
                            </span>
                            {b.totalScans > 0 && (
                              <span className="text-brand-400 font-semibold">{convRate}% converted</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Link
                            href={`/review/${b.qrToken}`}
                            target="_blank"
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Preview
                          </Link>
                          <button
                            onClick={() => setSelectedQR(b)}
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                          >
                            <QrCode className="w-3.5 h-3.5" /> QR
                          </button>
                          <button
                            onClick={() => openEdit(b)}
                            title="Edit"
                            className="p-1.5 rounded-lg border border-surface-border hover:border-brand-500/50 hover:text-brand-400 text-gray-500 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(b._id)}
                            title="Delete"
                            className="p-1.5 rounded-lg border border-surface-border hover:border-red-500/50 hover:text-red-400 text-gray-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ── Add / Edit Business Modal ────────────────────────────────────── */}
      {(showModal || editingBusiness) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowModal(false); setEditingBusiness(null); }}
          />
          <div className="relative glass rounded-2xl p-8 w-full max-w-md animate-fade-up max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-xl font-bold text-white mb-6">
              {editingBusiness ? "Edit Business" : "Add New Business"}
            </h2>

            <form onSubmit={editingBusiness ? handleUpdate : handleCreate} className="space-y-4">
              {/* Business Name */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Business Name</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="The Artisan Café"
                  className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Description</label>
                <textarea
                  required rows={3}
                  value={formData.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="A cozy neighbourhood café known for specialty coffee..."
                  className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors resize-none"
                />
              </div>

              {/* Category + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => set({ category: e.target.value })}
                    className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                  >
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Subscription Status</label>
                  <select
                    value={formData.subscriptionStatus}
                    onChange={(e) => set({ subscriptionStatus: e.target.value })}
                    className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>

              {/* Amount + End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Monthly Amount (₹)</label>
                  <input
                    type="number" min={0}
                    value={formData.subscriptionAmount}
                    onChange={(e) => set({ subscriptionAmount: Number(e.target.value) })}
                    className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Subscription End Date</label>
                  <input
                    type="date"
                    value={formData.subscriptionEndDate}
                    onChange={(e) => set({ subscriptionEndDate: e.target.value })}
                    className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Google Review URL */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Google Review URL</label>
                <input
                  type="url" required
                  value={formData.googleReviewUrl}
                  onChange={(e) => set({ googleReviewUrl: e.target.value })}
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                />
              </div>

              {/* Admin credentials — create only */}
              {!editingBusiness && (
                <div className="pt-4 border-t border-surface-border space-y-4">
                  <h3 className="font-display text-sm font-bold text-white">Business Admin Credentials</h3>
                  <div>
                    <label className="text-gray-400 text-sm mb-1.5 block">Admin Email</label>
                    <input
                      type="email" required
                      value={formData.adminEmail}
                      onChange={(e) => set({ adminEmail: e.target.value })}
                      placeholder="admin@business.com"
                      className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1.5 block">Admin Password</label>
                    <input
                      type="password" required
                      value={formData.adminPassword}
                      onChange={(e) => set({ adminPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingBusiness(null); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                    : editingBusiness
                    ? <><Edit className="w-4 h-4" /> Update</>
                    : <><Plus className="w-4 h-4" /> Create</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QR Code Modal ────────────────────────────────────────────────── */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedQR(null)} />
          <div className="relative glass rounded-2xl p-8 w-full max-w-sm text-center animate-fade-up">
            <h2 className="font-display text-xl font-bold text-white mb-2">{selectedQR.name}</h2>
            <p className="text-gray-400 text-sm mb-6">Scan to leave a review</p>
            {selectedQR.qrCode ? (
              <div className="bg-white p-4 rounded-xl inline-block mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedQR.qrCode} alt="QR Code" className="w-48 h-48" />
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
              <button onClick={() => setSelectedQR(null)} className="btn-secondary flex-1 text-sm">
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

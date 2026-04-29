"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, Users, Building, Trash2, Star } from "lucide-react";
import Link from "next/link";

interface Company {
    _id: string;
    email: string;
    companyName: string;
    isActive: boolean;
    createdAt: string;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        companyName: "",
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (status === "loading") return;

        if (!session || session.user.role !== "super_admin") {
            router.push("/login");
            return;
        }

        fetchCompanies();
    }, [session, status, router]);

    async function fetchCompanies() {
        try {
            const res = await fetch("/api/admin/companies");
            const data = await res.json();
            setCompanies(data.companies || []);
        } catch (error) {
            console.error("Failed to fetch companies:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch("/api/admin/companies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (res.ok) {
                setCompanies((prev) => [data.company, ...prev]);
                setShowModal(false);
                setFormData({ email: "", password: "", companyName: "" });
            }
        } catch (error) {
            console.error("Failed to create company:", error);
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this company and all their businesses?")) return;
        await fetch(`/api/admin/companies/${id}`, { method: "DELETE" });
        setCompanies((prev) => prev.filter((c) => c._id !== id));
    }

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

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
                            <span className="text-gray-400 text-sm">Admin</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
                                Dashboard
                            </Link>
                            <button
                                onClick={() => setShowModal(true)}
                                className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
                            >
                                <Plus className="w-4 h-4" /> Add Company
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-6 py-8">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        {[
                            { label: "Companies", value: companies.length, icon: Building, color: "brand" },
                            { label: "Active", value: companies.filter(c => c.isActive).length, icon: Users, color: "gold" },
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

                    {/* Companies list */}
                    {companies.length === 0 ? (
                        <div className="glass rounded-2xl p-16 text-center">
                            <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Building className="w-7 h-7 text-brand-400" />
                            </div>
                            <h3 className="font-display text-xl font-bold text-white mb-2">No companies yet</h3>
                            <p className="text-gray-400 text-sm mb-6">Add your first company to get started.</p>
                            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add First Company
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {companies.map((company) => (
                                <div key={company._id} className="glass rounded-2xl p-6 hover:border-brand-500/30 transition-all duration-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-display text-lg font-bold text-white">{company.companyName}</h3>
                                            <p className="text-gray-400 text-sm">{company.email}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`px-2 py-1 rounded-full text-xs ${company.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {company.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(company._id)}
                                            className="p-2 rounded-lg border border-surface-border hover:border-red-500/50 hover:text-red-400 text-gray-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Add Company Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative glass rounded-2xl p-8 w-full max-w-md animate-fade-up">
                        <h2 className="font-display text-xl font-bold text-white mb-6">Add New Company</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-sm mb-1.5 block">Company Name</label>
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    placeholder="ABC Corporation"
                                    required
                                    className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-1.5 block">Admin Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="admin@company.com"
                                    required
                                    className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-1.5 block">Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                                />
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
        </div>
    );
}
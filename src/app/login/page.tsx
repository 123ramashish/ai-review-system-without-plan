"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Lock, Mail } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSuperAdmin ? { password } : { email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.role === "superadmin") {
          router.push("/dashboard");
        } else {
          router.push("/admin-dashboard");
        }
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-surface flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden safe-area-pb">
      <div className="fixed inset-0 bg-mesh-gradient pointer-events-none opacity-30" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-display text-2xl font-bold text-white tracking-tight">
              ReviewGenius
            </span>
          </Link>
        </div>

        <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-fade-up w-full">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-white mb-2">
              {isSuperAdmin ? "Super Admin Login" : "Business Login"}
            </h1>
            <p className="text-gray-400 text-sm">
              {isSuperAdmin
                ? "Enter your master password to access all businesses."
                : "Sign in to manage your business reviews and QR codes."}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {!isSuperAdmin && (
              <div>
                <label className="text-gray-400 text-sm font-medium mb-2 block">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-card border border-surface-border focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-500 outline-none transition-all duration-200"
                    placeholder="Enter your email"
                    required={!isSuperAdmin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-gray-400 text-sm font-medium mb-2 block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-card border border-surface-border focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-500 outline-none transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSuperAdmin(!isSuperAdmin);
                setError("");
                setEmail("");
                setPassword("");
              }}
              className="text-gray-400 hover:text-brand-400 text-sm transition-colors"
            >
              {isSuperAdmin
                ? "Switch to Business Login"
                : "Switch to Super Admin Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

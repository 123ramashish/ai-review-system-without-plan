"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-5 py-12 safe-area-pb">
      <div className="fixed inset-0 bg-mesh-gradient pointer-events-none opacity-30" />
      <div className="relative z-10 w-full max-w-md glass rounded-2xl p-8 text-center border border-surface-border animate-fade-up">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center mx-auto mb-5">
          <FileQuestion className="w-7 h-7 text-brand-400" />
        </div>
        <p className="text-brand-400 text-xs font-semibold uppercase tracking-wider mb-2">404</p>
        <h1 className="font-display text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          The link may be broken or the page was removed. Check the URL or go back.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-3"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-5 py-12 safe-area-pb">
      <div className="fixed inset-0 bg-mesh-gradient pointer-events-none opacity-30" />
      <div className="relative z-10 w-full max-w-md glass rounded-2xl p-8 border border-red-500/20 text-center animate-fade-up">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="font-display text-xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          This page hit an unexpected error. You can try again or return home.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="text-left text-xs font-mono text-red-400/90 bg-red-500/5 rounded-lg p-3 mb-6 break-all">
            {error.message}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-3"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-3"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

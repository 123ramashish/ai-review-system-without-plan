import { Star } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 safe-area-pb">
      <div className="fixed inset-0 bg-mesh-gradient pointer-events-none opacity-40" />
      <div className="relative z-10 flex flex-col items-center gap-6 animate-fade-in">
        <div className="w-14 h-14 bg-brand-500/20 rounded-2xl flex items-center justify-center border border-brand-500/30">
          <Star className="w-7 h-7 text-brand-400 fill-brand-400/30 animate-pulse" />
        </div>
        <div className="space-y-2 text-center">
          <div className="h-3 w-40 rounded-full bg-surface-border shimmer mx-auto" />
          <div className="h-3 w-28 rounded-full bg-surface-border/80 shimmer mx-auto" />
        </div>
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    </div>
  );
}

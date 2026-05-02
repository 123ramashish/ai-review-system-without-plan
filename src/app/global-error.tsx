"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0f0f1a] text-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-gray-400 text-sm">Please refresh the page or try again later.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 px-4"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

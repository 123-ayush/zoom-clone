"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white border border-zoom-border rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
        <h1 className="text-xl font-semibold text-zoom-text mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-zoom-muted mb-6">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => unstable_retry()}
          className="bg-zoom-blue hover:bg-zoom-blue-h text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

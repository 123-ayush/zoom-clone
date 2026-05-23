"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MeetingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Meeting error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zoom-dark text-white p-6">
      <div className="text-center max-w-md">
        <h1 className="text-lg font-semibold mb-2">
          Couldn&apos;t load this meeting
        </h1>
        <p className="text-sm text-white/60 mb-6">
          {error.message || "Something went wrong in the meeting room."}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => unstable_retry()}
            className="bg-zoom-blue hover:bg-zoom-blue-h text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/")}
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}

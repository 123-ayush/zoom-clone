"use client";
import { useEffect, useState } from "react";
import { Download, Play, Trash2, Video } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { formatRelativeDate } from "@/lib/utils";
import type { Recording } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ClipsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Recording | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listRecordings()
      .then((data) => {
        if (!cancelled) {
          setRecordings(data);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load clips.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (rec: Recording) => {
    if (!confirm(`Delete "${rec.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteRecording(rec.id);
      setRecordings((prev) => prev.filter((r) => r.id !== rec.id));
      if (playing?.id === rec.id) setPlaying(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1">
        <h1 className="text-2xl font-semibold text-zoom-text mb-6">Clips</h1>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        )}

        {!loading && error && (
          <div className="bg-white border border-zoom-border rounded-2xl p-6 text-sm text-zoom-red">
            {error}
          </div>
        )}

        {!loading && !error && recordings.length === 0 && (
          <div className="bg-white border border-zoom-border rounded-2xl p-12 text-center">
            <Video size={36} className="text-zoom-muted mx-auto mb-3" />
            <p className="text-sm text-zoom-muted">
              No clips yet. Start a meeting and hit{" "}
              <span className="font-medium text-zoom-text">Record</span> to save
              one here.
            </p>
          </div>
        )}

        {!loading && !error && recordings.length > 0 && (
          <ul className="bg-white border border-zoom-border rounded-2xl divide-y divide-zoom-border overflow-hidden">
            {recordings.map((rec) => (
              <li
                key={rec.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50"
              >
                <div className="w-10 h-10 rounded-lg bg-zoom-blue/10 text-zoom-blue flex items-center justify-center shrink-0">
                  <Video size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zoom-text truncate">
                    {rec.title}
                  </p>
                  <p className="text-xs text-zoom-muted">
                    {formatRelativeDate(rec.created_at)} ·{" "}
                    {formatDuration(rec.duration_secs)} ·{" "}
                    {formatSize(rec.size_bytes)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPlaying(rec)}
                    className="p-2 rounded-full text-zoom-muted hover:text-zoom-blue hover:bg-zoom-blue/10 transition-colors"
                    title="Play"
                    aria-label={`Play ${rec.title}`}
                  >
                    <Play size={16} />
                  </button>
                  <a
                    href={`${API_BASE}${rec.url}`}
                    download
                    className="p-2 rounded-full text-zoom-muted hover:text-zoom-text hover:bg-gray-100 transition-colors"
                    title="Download"
                    aria-label={`Download ${rec.title}`}
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => handleDelete(rec)}
                    className="p-2 rounded-full text-zoom-muted hover:text-zoom-red hover:bg-red-50 transition-colors"
                    title="Delete"
                    aria-label={`Delete ${rec.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {playing && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setPlaying(null)}
        >
          <div
            className="bg-black rounded-2xl overflow-hidden max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between bg-zoom-darker text-white">
              <span className="text-sm font-medium truncate">{playing.title}</span>
              <button
                onClick={() => setPlaying(null)}
                className="text-white/60 hover:text-white"
              >
                Close
              </button>
            </div>
            <video
              src={`${API_BASE}${playing.url}`}
              controls
              autoPlay
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

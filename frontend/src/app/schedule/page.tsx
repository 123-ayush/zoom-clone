"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Check } from "lucide-react";
import { api } from "@/lib/api";

const DURATION_OPTIONS = [
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
];

export default function SchedulePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      await api.scheduleMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at,
        duration_mins: duration,
      });
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule meeting.");
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-zoom-surface flex flex-col">
      <header className="bg-zoom-card border-b border-zoom-border h-14 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2 text-zoom-muted hover:text-zoom-text transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <div className="mx-auto flex items-center gap-2">
          <div className="w-7 h-7 bg-zoom-blue rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-base leading-none">Z</span>
          </div>
          <span className="font-semibold text-zoom-text">zoom</span>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center p-4 pt-10">
        <div className="bg-zoom-card rounded-2xl shadow-sm border border-zoom-border p-8 w-full max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Calendar size={20} className="text-zoom-blue" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zoom-text">Schedule a Meeting</h1>
              <p className="text-xs text-zoom-muted">Set up a meeting for later</p>
            </div>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={28} className="text-green-600" />
              </div>
              <p className="font-medium text-zoom-text">Meeting scheduled!</p>
              <p className="text-sm text-zoom-muted">Redirecting to dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-zoom-muted mb-1">
                  Meeting title <span className="text-zoom-red">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Weekly Team Standup"
                  maxLength={100}
                  className="w-full border border-zoom-border rounded-lg px-3 py-2.5 text-sm text-zoom-text focus:outline-none focus:ring-2 focus:ring-zoom-blue focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zoom-muted mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this meeting about? (optional)"
                  rows={3}
                  maxLength={500}
                  className="w-full border border-zoom-border rounded-lg px-3 py-2.5 text-sm text-zoom-text focus:outline-none focus:ring-2 focus:ring-zoom-blue focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zoom-muted mb-1">
                    Date <span className="text-zoom-red">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={today}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-zoom-border rounded-lg px-3 py-2.5 text-sm text-zoom-text focus:outline-none focus:ring-2 focus:ring-zoom-blue focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zoom-muted mb-1">
                    Time <span className="text-zoom-red">*</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border border-zoom-border rounded-lg px-3 py-2.5 text-sm text-zoom-text focus:outline-none focus:ring-2 focus:ring-zoom-blue focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zoom-muted mb-1">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full border border-zoom-border rounded-lg px-3 py-2.5 text-sm text-zoom-text focus:outline-none focus:ring-2 focus:ring-zoom-blue focus:border-transparent bg-zoom-card"
                >
                  {DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-xs text-zoom-red">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zoom-blue text-white rounded-lg py-2.5 text-sm font-medium hover:bg-zoom-blue-h transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? "Scheduling…" : "Schedule Meeting"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Video } from "lucide-react";
import { api } from "@/lib/api";
import { formatMeetingId, setStoredName } from "@/lib/utils";
import JoinNameModal from "@/components/modals/JoinNameModal";
import type { Meeting } from "@/types";

export default function JoinPage() {
  const router = useRouter();
  const [rawId, setRawId] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [foundMeeting, setFoundMeeting] = useState<Meeting | null>(null);
  const [joining, setJoining] = useState(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setRawId(digits);
    setError("");
  };

  const handleCheck = async () => {
    const meetingId = formatMeetingId(rawId);
    setChecking(true);
    setError("");
    try {
      const meeting = await api.getMeeting(meetingId);
      if (meeting.status === "ended") {
        setError("This meeting has already ended.");
      } else {
        setFoundMeeting(meeting);
      }
    } catch {
      setError("Meeting not found. Check the ID and try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleJoin = async (displayName: string) => {
    if (!foundMeeting) return;
    setJoining(true);
    try {
      const res = await api.joinMeeting(foundMeeting.meeting_id, displayName);
      setStoredName(displayName);
      router.push(`/meeting/${foundMeeting.meeting_id}?pid=${res.participant.id}`);
    } catch {
      setJoining(false);
      setError("Failed to join. Please try again.");
    }
  };

  const displayId = formatMeetingId(rawId);

  return (
    <div className="min-h-screen bg-zoom-surface flex flex-col">
      <header className="bg-white border-b border-zoom-border h-14 flex items-center px-6">
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

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-zoom-border p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Video size={20} className="text-zoom-blue" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zoom-text">Join a Meeting</h1>
              <p className="text-xs text-zoom-muted">Enter a meeting ID or link</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-zoom-muted mb-1">
                Meeting ID
              </label>
              <input
                type="text"
                value={displayId}
                onChange={handleInput}
                placeholder="123-4567-8901"
                className="w-full border border-zoom-border rounded-lg px-3 py-2.5 text-sm text-zoom-text font-mono focus:outline-none focus:ring-2 focus:ring-zoom-blue focus:border-transparent"
                onKeyDown={(e) => e.key === "Enter" && rawId.length >= 3 && handleCheck()}
              />
              {error && <p className="text-xs text-zoom-red mt-1.5">{error}</p>}
            </div>

            <button
              onClick={handleCheck}
              disabled={rawId.length < 3 || checking}
              className="w-full bg-zoom-blue text-white rounded-lg py-2.5 text-sm font-medium hover:bg-zoom-blue-h transition-colors disabled:opacity-50"
            >
              {checking ? "Checking…" : "Continue"}
            </button>

            <p className="text-center text-xs text-zoom-muted">
              Don&apos;t have a meeting ID?{" "}
              <Link href="/schedule" className="text-zoom-blue hover:underline font-medium">
                Schedule one
              </Link>
            </p>
          </div>
        </div>
      </main>

      <JoinNameModal
        meetingId={foundMeeting?.meeting_id ?? ""}
        meetingTitle={foundMeeting?.title}
        isOpen={!!foundMeeting}
        onJoin={handleJoin}
        loading={joining}
      />
    </div>
  );
}

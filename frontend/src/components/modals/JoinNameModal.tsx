"use client";
import { useState } from "react";
import UserAvatar from "@/components/ui/UserAvatar";
import Spinner from "@/components/ui/Spinner";
import { getStoredName } from "@/lib/utils";

interface Props {
  meetingId: string;
  meetingTitle?: string;
  isOpen: boolean;
  onJoin: (displayName: string) => void;
  loading?: boolean;
}

export default function JoinNameModal({
  meetingId,
  meetingTitle,
  isOpen,
  onJoin,
  loading,
}: Props) {
  const [name, setName] = useState(() => getStoredName());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-zoom-text mb-1">Join Meeting</h2>
        {meetingTitle && (
          <p className="text-sm text-zoom-muted mb-4">{meetingTitle}</p>
        )}
        {!meetingTitle && (
          <p className="text-sm text-zoom-muted mb-4 font-mono">{meetingId}</p>
        )}

        <div className="flex flex-col items-center gap-3 py-4 border-y border-zoom-border mb-4">
          <UserAvatar name={name || "?"} size={64} />
          <p className="text-sm text-zoom-muted">Your preview</p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-zoom-muted mb-1">
              Your display name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={50}
              className="w-full border border-zoom-border rounded-lg px-3 py-2 text-sm text-zoom-text focus:outline-none focus:ring-2 focus:ring-zoom-blue focus:border-transparent"
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onJoin(name.trim())}
              autoFocus
            />
          </div>
          <button
            onClick={() => onJoin(name.trim())}
            disabled={!name.trim() || loading}
            className="w-full bg-zoom-blue text-white rounded-lg py-2.5 text-sm font-medium hover:bg-zoom-blue-h transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Spinner className="border-white border-t-transparent" /> : null}
            Join Now
          </button>
        </div>
      </div>
    </div>
  );
}

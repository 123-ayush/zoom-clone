"use client";
import { useRouter } from "next/navigation";
import { Users, Clock, Copy, Check, Video, Calendar } from "lucide-react";
import type { Meeting } from "@/types";
import { formatRelativeDate, formatDate, formatTime, formatDuration, copyToClipboard } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { useState } from "react";

interface Props {
  meeting: Meeting;
  variant: "upcoming" | "recent";
}

export default function MeetingCard({ meeting, variant }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(meeting.invite_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    router.push(`/meeting/${meeting.meeting_id}?host=1`);
  };

  const handleJoin = () => {
    router.push(`/meeting/${meeting.meeting_id}`);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-zoom-border hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${variant === "upcoming" ? "bg-blue-50" : "bg-gray-100"}`}>
          {variant === "upcoming" ? (
            <Calendar size={18} className="text-zoom-blue" />
          ) : (
            <Video size={18} className="text-zoom-muted" />
          )}
        </div>

        <div className="min-w-0">
          <p className="font-medium text-zoom-text text-sm truncate">{meeting.title}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-zoom-muted flex items-center gap-1">
              <Clock size={11} />
              {variant === "upcoming"
                ? formatRelativeDate(meeting.scheduled_at ?? meeting.created_at)
                : `${formatDate(meeting.started_at ?? meeting.created_at)}, ${formatTime(meeting.started_at ?? meeting.created_at)}`}
            </span>
            <span className="text-xs text-zoom-muted flex items-center gap-1">
              <Users size={11} />
              {meeting.participant_count}
            </span>
            <span className="text-xs text-zoom-muted">
              {formatDuration(meeting.duration_mins)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        {variant === "upcoming" && (
          <>
            <Badge variant="blue">
              {meeting.status === "active" ? "Live" : "Upcoming"}
            </Badge>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md hover:bg-gray-100 text-zoom-muted hover:text-zoom-text transition-colors"
              title="Copy invite link"
            >
              {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
            </button>
            <button
              onClick={meeting.status === "active" ? handleJoin : handleStart}
              className="px-3 py-1.5 bg-zoom-blue text-white text-xs font-medium rounded-lg hover:bg-zoom-blue-h transition-colors"
            >
              {meeting.status === "active" ? "Join" : "Start"}
            </button>
          </>
        )}
        {variant === "recent" && (
          <span className="text-xs text-zoom-muted bg-gray-50 px-2 py-1 rounded">
            Ended
          </span>
        )}
      </div>
    </div>
  );
}

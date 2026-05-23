"use client";
import type { Participant } from "@/types";
import ParticipantTile from "./ParticipantTile";

interface Props {
  participants: Participant[];
  selfParticipantId: number | null;
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  screenSharingClientId: number | null;
}

function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-2 sm:grid-cols-3";
  return "grid-cols-2 sm:grid-cols-4";
}

export default function VideoGrid({
  participants,
  selfParticipantId,
  localStream,
  remoteStreams,
  isVideoOff,
  screenSharingClientId,
}: Props) {
  const ordered = [...participants].sort((a, b) => {
    if (a.id === screenSharingClientId) return -1;
    if (b.id === screenSharingClientId) return 1;
    return 0;
  });

  const count = ordered.length || 1;
  return (
    <div className={`flex-1 p-2 sm:p-3 grid gap-2 content-center ${gridClass(count)}`}>
      {ordered.length === 0 ? (
        <div className="flex items-center justify-center text-white/40 text-sm">
          Waiting for participants…
        </div>
      ) : (
        ordered.map((p) => {
          const isSelf = p.id === selfParticipantId;
          const stream = isSelf ? localStream : remoteStreams.get(p.id) ?? null;
          return (
            <ParticipantTile
              key={p.id}
              participant={p}
              isSelf={isSelf}
              stream={stream}
              isVideoOff={isSelf ? isVideoOff : p.is_video_off}
              isScreenSharing={screenSharingClientId === p.id}
            />
          );
        })
      )}
    </div>
  );
}

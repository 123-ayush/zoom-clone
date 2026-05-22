"use client";
import type { Participant } from "@/types";
import ParticipantTile from "./ParticipantTile";

interface Props {
  participants: Participant[];
  selfParticipantId: number | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isVideoOff: boolean;
}

function gridClass(count: number): string {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  return "grid-cols-3";
}

export default function VideoGrid({ participants, selfParticipantId, videoRef, isVideoOff }: Props) {
  const count = participants.length || 1;
  return (
    <div className={`flex-1 p-3 grid gap-2 content-center ${gridClass(count)}`}>
      {participants.length === 0 ? (
        <div className="flex items-center justify-center text-white/40 text-sm">
          Waiting for participants…
        </div>
      ) : (
        participants.map((p) => (
          <ParticipantTile
            key={p.id}
            participant={p}
            isSelf={p.id === selfParticipantId}
            videoRef={p.id === selfParticipantId ? videoRef : undefined}
            isVideoOff={p.id === selfParticipantId ? isVideoOff : p.is_video_off}
          />
        ))
      )}
    </div>
  );
}

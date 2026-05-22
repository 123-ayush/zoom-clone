"use client";
import { MicOff, VideoOff } from "lucide-react";
import type { Participant } from "@/types";
import { avatarColor, initials } from "@/lib/utils";

interface Props {
  participant: Participant;
  isSelf: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isVideoOff?: boolean;
}

export default function ParticipantTile({ participant, isSelf, videoRef, isVideoOff }: Props) {
  const bg = avatarColor(participant.display_name);
  const label = initials(participant.display_name);
  const showAvatar = !isSelf || isVideoOff;

  return (
    <div className="relative bg-zoom-tile rounded-xl overflow-hidden flex items-center justify-center aspect-video">
      {isSelf && !isVideoOff && videoRef ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : null}

      {showAvatar && (
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
          style={{ background: bg }}
        >
          {label}
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded font-medium">
          {participant.display_name}{isSelf ? " (You)" : ""}
          {participant.role === "host" ? " · Host" : ""}
        </span>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1">
        {participant.is_muted && (
          <div className="bg-zoom-red rounded-full p-1">
            <MicOff size={12} className="text-white" />
          </div>
        )}
        {participant.is_video_off && (
          <div className="bg-black/50 rounded-full p-1">
            <VideoOff size={12} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

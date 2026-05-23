"use client";
import { useEffect, useRef } from "react";
import { MicOff, Monitor, VideoOff } from "lucide-react";

import type { Participant } from "@/types";
import { avatarColor, initials } from "@/lib/utils";

interface Props {
  participant: Participant;
  isSelf: boolean;
  stream: MediaStream | null;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
}

export default function ParticipantTile({
  participant,
  isSelf,
  stream,
  isVideoOff,
  isScreenSharing = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const bg = avatarColor(participant.display_name);
  const label = initials(participant.display_name);
  const hasVideo = !!stream && !isVideoOff;

  return (
    <div className="relative bg-zoom-tile rounded-xl overflow-hidden flex items-center justify-center aspect-video">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isSelf}
          playsInline
          className={`w-full h-full object-cover ${isSelf && !isScreenSharing ? "-scale-x-100" : ""}`}
        />
      ) : (
        <div
          className="size-12 xs:size-16 sm:size-20 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold"
          style={{ background: bg }}
        >
          {label}
        </div>
      )}

      {/* Name label with gradient backdrop */}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4">
        <span className="text-white text-[10px] xs:text-xs font-medium truncate block">
          {participant.display_name}
          {isSelf ? " (You)" : ""}
          {participant.role === "host" ? " · Host" : ""}
        </span>
      </div>

      {/* Status indicators */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
        {isScreenSharing && (
          <div className="bg-zoom-blue rounded-full p-1" title="Sharing screen">
            <Monitor size={10} className="text-white" />
          </div>
        )}
        {participant.is_muted && (
          <div className="bg-zoom-red rounded-full p-1" title="Muted">
            <MicOff size={10} className="text-white" />
          </div>
        )}
        {isVideoOff && (
          <div className="bg-black/50 rounded-full p-1" title="Video off">
            <VideoOff size={10} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

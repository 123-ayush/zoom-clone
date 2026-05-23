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
          className={`w-full h-full object-cover ${isSelf && !isScreenSharing ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
          style={{ background: bg }}
        >
          {label}
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded font-medium">
          {participant.display_name}
          {isSelf ? " (You)" : ""}
          {participant.role === "host" ? " · Host" : ""}
        </span>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1">
        {isScreenSharing && (
          <div className="bg-zoom-blue rounded-full p-1" title="Sharing screen">
            <Monitor size={12} className="text-white" />
          </div>
        )}
        {participant.is_muted && (
          <div className="bg-zoom-red rounded-full p-1" title="Muted">
            <MicOff size={12} className="text-white" />
          </div>
        )}
        {isVideoOff && (
          <div className="bg-black/50 rounded-full p-1" title="Video off">
            <VideoOff size={12} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

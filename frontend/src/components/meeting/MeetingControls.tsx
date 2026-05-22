"use client";
import {
  Mic, MicOff, Video, VideoOff, Users, MessageSquare,
  Monitor, PhoneOff, ChevronUp,
} from "lucide-react";

interface Props {
  isMuted: boolean;
  isVideoOff: boolean;
  isHost: boolean;
  showParticipants: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleParticipants: () => void;
  onLeave: () => void;
  onEndForAll?: () => void;
}

function ControlBtn({
  icon,
  label,
  onClick,
  danger = false,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors cursor-pointer
        ${danger ? "bg-zoom-red hover:bg-red-700 text-white" : active ? "text-white bg-white/10" : "text-white hover:bg-white/10"}`}
    >
      {icon}
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function MeetingControls({
  isMuted, isVideoOff, isHost, showParticipants,
  onToggleMute, onToggleVideo, onToggleParticipants, onLeave, onEndForAll,
}: Props) {
  return (
    <div className="bg-zoom-darker border-t border-white/10 h-20 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-1">
        <ControlBtn
          icon={isMuted ? <MicOff size={20} className="text-zoom-red" /> : <Mic size={20} />}
          label={isMuted ? "Unmute" : "Mute"}
          onClick={onToggleMute}
          active={isMuted}
        />
        <ControlBtn
          icon={isVideoOff ? <VideoOff size={20} className="text-zoom-red" /> : <Video size={20} />}
          label={isVideoOff ? "Start Video" : "Stop Video"}
          onClick={onToggleVideo}
          active={isVideoOff}
        />
      </div>

      <div className="flex items-center gap-1">
        <ControlBtn
          icon={<Monitor size={20} className="text-white/40" />}
          label="Share Screen"
          onClick={() => {}}
        />
        <ControlBtn
          icon={<MessageSquare size={20} />}
          label="Chat"
          onClick={() => {}}
        />
        <ControlBtn
          icon={<Users size={20} />}
          label="Participants"
          onClick={onToggleParticipants}
          active={showParticipants}
        />
      </div>

      <div className="flex items-center gap-2">
        {isHost && onEndForAll && (
          <div className="relative group">
            <button
              onClick={onEndForAll}
              className="flex items-center gap-1.5 bg-zoom-red hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              End <ChevronUp size={14} />
            </button>
          </div>
        )}
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 bg-zoom-red hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <PhoneOff size={16} />
          {isHost ? "Leave" : "Leave"}
        </button>
      </div>
    </div>
  );
}

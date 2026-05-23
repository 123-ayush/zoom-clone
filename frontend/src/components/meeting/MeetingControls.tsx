"use client";
import {
  ChevronUp,
  Circle,
  CircleStop,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PenSquare,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

type Panel = "none" | "participants" | "chat" | "whiteboard";

interface Props {
  isMuted: boolean;
  isVideoOff: boolean;
  isHost: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  activePanel: Panel;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onToggleWhiteboard: () => void;
  onToggleRecording: () => void;
  onLeave: () => void;
  onEndForAll?: () => void;
}

function ControlBtn({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
        active ? "text-white bg-white/15" : "text-white hover:bg-white/10"
      }`}
    >
      {icon}
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function MeetingControls(props: Props) {
  const {
    isMuted,
    isVideoOff,
    isHost,
    isScreenSharing,
    isRecording,
    activePanel,
    onToggleMute,
    onToggleVideo,
    onToggleScreenShare,
    onToggleParticipants,
    onToggleChat,
    onToggleWhiteboard,
    onToggleRecording,
    onLeave,
    onEndForAll,
  } = props;

  return (
    <div className="bg-zoom-darker border-t border-white/10 h-20 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-1">
        <ControlBtn
          icon={isMuted ? <MicOff size={20} className="text-zoom-red" /> : <Mic size={20} />}
          label={isMuted ? "Unmute" : "Mute"}
          onClick={onToggleMute}
          active={isMuted}
        />
        <ControlBtn
          icon={
            isVideoOff ? <VideoOff size={20} className="text-zoom-red" /> : <Video size={20} />
          }
          label={isVideoOff ? "Start Video" : "Stop Video"}
          onClick={onToggleVideo}
          active={isVideoOff}
        />
      </div>

      <div className="flex items-center gap-1">
        <ControlBtn
          icon={
            isScreenSharing ? (
              <MonitorOff size={20} className="text-zoom-blue" />
            ) : (
              <Monitor size={20} />
            )
          }
          label={isScreenSharing ? "Stop Share" : "Share"}
          onClick={onToggleScreenShare}
          active={isScreenSharing}
        />
        <ControlBtn
          icon={<MessageSquare size={20} />}
          label="Chat"
          onClick={onToggleChat}
          active={activePanel === "chat"}
        />
        <ControlBtn
          icon={<Users size={20} />}
          label="People"
          onClick={onToggleParticipants}
          active={activePanel === "participants"}
        />
        <ControlBtn
          icon={<PenSquare size={20} />}
          label="Whiteboard"
          onClick={onToggleWhiteboard}
          active={activePanel === "whiteboard"}
        />
        <ControlBtn
          icon={
            isRecording ? (
              <CircleStop size={20} className="text-zoom-red" />
            ) : (
              <Circle size={20} />
            )
          }
          label={isRecording ? "Stop Rec" : "Record"}
          onClick={onToggleRecording}
          active={isRecording}
        />
      </div>

      <div className="flex items-center gap-2">
        {isHost && onEndForAll && (
          <button
            onClick={onEndForAll}
            className="hidden sm:flex items-center gap-1.5 bg-zoom-red hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            End <ChevronUp size={14} />
          </button>
        )}
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 bg-zoom-red hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <PhoneOff size={16} />
          Leave
        </button>
      </div>
    </div>
  );
}

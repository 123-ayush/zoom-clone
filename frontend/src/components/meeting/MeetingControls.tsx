"use client";
import {
  Circle,
  CircleStop,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MoreHorizontal,
  PenSquare,
  Pencil,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  onRename: () => void;
  onLeave: () => void;
  onEndForAll?: () => void;
}

function CtrlBtn({
  icon,
  label,
  onClick,
  active = false,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        aria-label={label}
        className={cn(
          "flex flex-col items-center gap-0.5 px-2 xs:px-3 py-2 rounded-xl transition-all cursor-pointer select-none",
          danger && "text-zoom-red",
          active && !danger && "bg-white/15 text-white",
          !active && !danger && "text-white/75 hover:bg-white/10 hover:text-white"
        )}
      >
        <span className="flex items-center justify-center size-8">{icon}</span>
        <span className="text-[10px] xs:text-xs font-medium hidden xs:block whitespace-nowrap">
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="xs:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function MeetingControls({
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
  onRename,
  onLeave,
  onEndForAll,
}: Props) {
  return (
    <div className="bg-zoom-darker border-t border-white/10 px-2 xs:px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between shrink-0 gap-1">
      {/* Primary: mic + camera */}
      <div className="flex items-center gap-0.5">
        <CtrlBtn
          icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          label={isMuted ? "Unmute" : "Mute"}
          onClick={onToggleMute}
          danger={isMuted}
        />
        <CtrlBtn
          icon={isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          label={isVideoOff ? "Start Video" : "Stop Video"}
          onClick={onToggleVideo}
          danger={isVideoOff}
        />
      </div>

      {/* Center: secondary controls */}
      <div className="flex items-center gap-0.5">
        <CtrlBtn
          icon={isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          label={isScreenSharing ? "Stop Share" : "Share"}
          onClick={onToggleScreenShare}
          active={isScreenSharing}
        />
        <CtrlBtn
          icon={<MessageSquare size={20} />}
          label="Chat"
          onClick={onToggleChat}
          active={activePanel === "chat"}
        />
        <CtrlBtn
          icon={<Users size={20} />}
          label="People"
          onClick={onToggleParticipants}
          active={activePanel === "participants"}
        />

        {/* More dropdown: whiteboard + recording */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="More options"
            className="flex flex-col items-center gap-0.5 px-2 xs:px-3 py-2 rounded-xl text-white/75 hover:bg-white/10 hover:text-white transition-all cursor-pointer select-none"
          >
            <span className="flex items-center justify-center size-8">
              <MoreHorizontal size={20} />
            </span>
            <span className="text-[10px] xs:text-xs font-medium hidden xs:block">More</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="center"
            className="bg-zoom-panel border-white/10 text-white w-48 mb-1"
          >
            <DropdownMenuItem
              onClick={onToggleWhiteboard}
              className={cn(
                "gap-3 cursor-pointer focus:bg-white/10 focus:text-white",
                activePanel === "whiteboard" && "bg-white/10"
              )}
            >
              <PenSquare size={16} />
              Whiteboard
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={onRename}
              className="gap-3 cursor-pointer focus:bg-white/10 focus:text-white"
            >
              <Pencil size={16} />
              Rename me
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={onToggleRecording}
              className={cn(
                "gap-3 cursor-pointer focus:bg-white/10",
                isRecording ? "text-zoom-red focus:text-zoom-red" : "focus:text-white"
              )}
            >
              {isRecording ? <CircleStop size={16} /> : <Circle size={16} />}
              {isRecording ? "Stop Recording" : "Record"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: leave / end */}
      <div className="flex items-center gap-1.5">
        {isHost && onEndForAll && (
          <button
            onClick={onEndForAll}
            className="hidden sm:flex items-center gap-1.5 bg-zoom-red hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            End for All
          </button>
        )}
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 bg-zoom-red hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <PhoneOff size={16} />
          <span className="hidden xs:inline">Leave</span>
        </button>
      </div>
    </div>
  );
}

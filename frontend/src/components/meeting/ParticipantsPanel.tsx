"use client";
import { Mic, MicOff, Shield, UserX, X } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import UserAvatar from "@/components/ui/UserAvatar";
import { api } from "@/lib/api";
import type { Participant } from "@/types";

interface Props {
  isOpen: boolean;
  participants: Participant[];
  isHost: boolean;
  selfParticipantId: number | null;
  onClose: () => void;
  onMuteAll: () => void;
  onRemove: (participantId: number) => void;
}

export default function ParticipantsPanel({
  isOpen,
  participants,
  isHost,
  selfParticipantId,
  onClose,
  onMuteAll,
  onRemove,
}: Props) {
  const handleToggleMute = async (p: Participant) => {
    try {
      await api.muteParticipant(p.id, !p.is_muted);
    } catch (err) {
      console.error("Mute failed:", err);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-80 data-[side=right]:w-80 data-[side=right]:sm:max-w-80 bg-zoom-panel border-l border-white/10 text-white flex flex-col p-0 gap-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <SheetTitle className="text-white text-sm font-semibold">
            Participants ({participants.length})
          </SheetTitle>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close participants panel"
          >
            <X size={18} />
          </button>
        </div>

        {isHost && (
          <div className="px-4 py-2 border-b border-white/10 shrink-0">
            <button
              onClick={onMuteAll}
              className="w-full text-xs font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5"
            >
              <MicOff size={13} />
              Mute All
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5"
            >
              <UserAvatar name={p.display_name} size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-sm truncate">{p.display_name}</span>
                  {p.role === "host" && (
                    <Shield size={11} className="text-zoom-blue shrink-0" />
                  )}
                  {p.id === selfParticipantId && (
                    <span className="text-white/40 text-xs">(You)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {p.is_muted ? (
                  <MicOff size={14} className="text-zoom-red" />
                ) : (
                  <Mic size={14} className="text-green-400" />
                )}
                {isHost && p.id !== selfParticipantId && (
                  <>
                    <button
                      onClick={() => handleToggleMute(p)}
                      className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                      title={p.is_muted ? "Unmute" : "Mute"}
                      aria-label={p.is_muted ? "Unmute" : "Mute"}
                    >
                      {p.is_muted ? <Mic size={13} /> : <MicOff size={13} />}
                    </button>
                    <button
                      onClick={() => onRemove(p.id)}
                      className="p-1 rounded hover:bg-zoom-red/20 text-white/40 hover:text-zoom-red transition-colors"
                      title="Remove participant"
                      aria-label="Remove participant"
                    >
                      <UserX size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

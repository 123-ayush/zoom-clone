"use client";
import { X, MicOff, Mic, UserX, Shield } from "lucide-react";
import type { Participant } from "@/types";
import Avatar from "@/components/ui/Avatar";
import { api } from "@/lib/api";

interface Props {
  participants: Participant[];
  isHost: boolean;
  meetingId: string;
  selfParticipantId: number | null;
  onClose: () => void;
  onMuteAll: () => void;
  onParticipantsChange: () => void;
}

export default function ParticipantsPanel({
  participants, isHost, meetingId, selfParticipantId, onClose, onMuteAll, onParticipantsChange,
}: Props) {
  const handleRemove = async (participantId: number) => {
    try {
      await api.removeParticipant(meetingId, participantId);
      onParticipantsChange();
    } catch { /* silently fail */ }
  };

  const handleToggleMute = async (p: Participant) => {
    try {
      await api.muteParticipant(p.id, !p.is_muted);
      onParticipantsChange();
    } catch { /* silently fail */ }
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-72 bg-zoom-panel border-l border-white/10 flex flex-col z-30">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white font-semibold text-sm">
          Participants ({participants.length})
        </span>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {isHost && (
        <div className="px-4 py-2 border-b border-white/10">
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
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5">
            <Avatar name={p.display_name} size={32} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white text-sm truncate">{p.display_name}</span>
                {p.role === "host" && <Shield size={11} className="text-zoom-blue shrink-0" />}
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
                  >
                    {p.is_muted ? <Mic size={13} /> : <MicOff size={13} />}
                  </button>
                  <button
                    onClick={() => handleRemove(p.id)}
                    className="p-1 rounded hover:bg-zoom-red/20 text-white/40 hover:text-zoom-red transition-colors"
                    title="Remove participant"
                  >
                    <UserX size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

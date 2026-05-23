"use client";
import { createContext, useContext, useState, useCallback } from "react";
import type { Meeting, Participant } from "@/types";
import { getStoredName } from "@/lib/utils";

interface MeetingState {
  meeting: Meeting | null;
  participant: Participant | null;
  displayName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  setMeeting: (m: Meeting) => void;
  setParticipant: (p: Participant) => void;
  setDisplayName: (n: string) => void;
  setIsMuted: (v: boolean) => void;
  setIsVideoOff: (v: boolean) => void;
  clearMeeting: () => void;
}

const MeetingContext = createContext<MeetingState>({} as MeetingState);

export function MeetingProvider({ children }: { children: React.ReactNode }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [displayName, setDisplayName] = useState(() => getStoredName() || "");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const clearMeeting = useCallback(() => {
    setMeeting(null);
    setParticipant(null);
  }, []);

  return (
    <MeetingContext.Provider
      value={{
        meeting,
        participant,
        displayName,
        isMuted,
        isVideoOff,
        setMeeting,
        setParticipant,
        setDisplayName,
        setIsMuted,
        setIsVideoOff,
        clearMeeting,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeetingCtx(): MeetingState {
  return useContext(MeetingContext);
}

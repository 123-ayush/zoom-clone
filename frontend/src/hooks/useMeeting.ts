"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import type { Meeting, Participant } from "@/types";

export function useMeeting(meetingId: string) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchParticipants = useCallback(async () => {
    if (!meetingId) return;
    try {
      const data = await api.getParticipants(meetingId);
      setParticipants(data);
    } catch {
      // silently ignore poll errors
    }
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) return;
    const init = async () => {
      try {
        const m = await api.getMeeting(meetingId);
        setMeeting(m);
        const ps = await api.getParticipants(meetingId);
        setParticipants(ps);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Meeting not found");
      } finally {
        setLoading(false);
      }
    };
    init();
    intervalRef.current = setInterval(fetchParticipants, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [meetingId, fetchParticipants]);

  return { meeting, participants, loading, error, setMeeting, setParticipants };
}

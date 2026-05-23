"use client";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { IncomingWSMessage } from "@/lib/ws";
import type { Meeting, Participant } from "@/types";

type Subscribe =
  | ((handler: (msg: IncomingWSMessage) => void) => () => void)
  | null;

interface UseMeetingResult {
  meeting: Meeting | null;
  participants: Participant[];
  loading: boolean;
  error: string | null;
  setMeeting: (m: Meeting | null) => void;
  setParticipants: (p: Participant[]) => void;
}

export function useMeeting(
  meetingId: string,
  subscribe: Subscribe = null
): UseMeetingResult {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load — meeting + active participants over HTTP.
  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;

    Promise.all([api.getMeeting(meetingId), api.getParticipants(meetingId)])
      .then(([m, ps]) => {
        if (cancelled) return;
        setMeeting(m);
        setParticipants(ps);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load meeting");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  // Real-time updates over WebSocket. The polling that used to live here is gone.
  useEffect(() => {
    if (!subscribe) return;
    return subscribe((msg) => {
      switch (msg.type) {
        case "room-state":
        case "peer-joined": {
          // The PeerInfo payload doesn't carry every Participant field, so
          // re-fetch the canonical list. Cheap; happens on join, not per-message.
          api
            .getParticipants(meetingId)
            .then((ps) => setParticipants(ps))
            .catch(() => {});
          break;
        }
        case "peer-left": {
          setParticipants((prev) =>
            prev.filter((p) => p.id !== msg.payload.clientId)
          );
          break;
        }
        case "state-update": {
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === msg.payload.clientId
                ? {
                    ...p,
                    is_muted:
                      msg.payload.isMuted !== undefined
                        ? msg.payload.isMuted
                        : p.is_muted,
                    is_video_off:
                      msg.payload.isVideoOff !== undefined
                        ? msg.payload.isVideoOff
                        : p.is_video_off,
                  }
                : p
            )
          );
          break;
        }
        case "peer-renamed": {
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === msg.payload.clientId
                ? { ...p, display_name: msg.payload.displayName }
                : p
            )
          );
          break;
        }
        case "meeting-ended": {
          setMeeting((m) =>
            m ? { ...m, status: "ended", ended_at: new Date().toISOString() } : m
          );
          break;
        }
        default:
          break;
      }
    });
  }, [subscribe, meetingId]);

  return { meeting, participants, loading, error, setMeeting, setParticipants };
}

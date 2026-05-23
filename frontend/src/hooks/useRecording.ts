"use client";
import { useCallback, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { OutgoingWSMessage } from "@/lib/ws";

interface UseRecordingArgs {
  meetingId: string;
  participantId: number | null;
  stream: MediaStream | null;
  send: (msg: OutgoingWSMessage) => void;
  meetingTitle: string;
}

const PREFERRED_MIME = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function useRecording({
  meetingId,
  participantId,
  stream,
  send,
  meetingTitle,
}: UseRecordingArgs) {
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    if (!stream || isRecording) return;
    setError(null);

    const mimeType =
      typeof MediaRecorder !== "undefined"
        ? PREFERRED_MIME.find((m) => MediaRecorder.isTypeSupported(m))
        : undefined;
    if (!mimeType) {
      setError("Recording isn't supported in this browser.");
      return;
    }

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        chunksRef.current = [];
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setUploading(true);
        try {
          const title = `${meetingTitle} — ${new Date().toLocaleString()}`;
          await api.uploadRecording(
            meetingId,
            blob,
            title,
            duration,
            participantId ?? undefined
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Upload failed.");
        } finally {
          setUploading(false);
          send({ type: "recording-stopped", payload: {} });
        }
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      send({ type: "recording-started", payload: {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start recording.");
    }
  }, [stream, isRecording, meetingId, participantId, send, meetingTitle]);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, uploading, error, start, stop };
}

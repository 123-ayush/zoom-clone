"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Copy, Check, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useMeeting } from "@/hooks/useMeeting";
import JoinNameModal from "@/components/modals/JoinNameModal";
import VideoGrid from "@/components/meeting/VideoGrid";
import MeetingControls from "@/components/meeting/MeetingControls";
import ParticipantsPanel from "@/components/meeting/ParticipantsPanel";
import Spinner from "@/components/ui/Spinner";
import type { Participant } from "@/types";
import { copyToClipboard } from "@/lib/utils";

export default function MeetingRoomPage() {
  const params = useParams<{ meetingId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingId = params.meetingId;

  const isHost = searchParams.get("host") === "1";
  const initialPid = searchParams.get("pid") ? Number(searchParams.get("pid")) : null;

  const { meeting, participants, loading, error, setParticipants } = useMeeting(meetingId);

  const [selfParticipantId, setSelfParticipantId] = useState<number | null>(initialPid);
  const [showJoinModal, setShowJoinModal] = useState(!initialPid);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setIsVideoOff(true);
    }
  }, []);

  useEffect(() => {
    if (!showJoinModal) startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [showJoinModal, startCamera]);

  const handleJoin = async (displayName: string) => {
    setJoining(true);
    setJoinError("");
    try {
      const res = await api.joinMeeting(meetingId, displayName);
      setSelfParticipantId(res.participant.id);
      setShowJoinModal(false);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Failed to join.");
      setJoining(false);
    }
  };

  const handleToggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
    if (selfParticipantId) {
      await api.muteParticipant(selfParticipantId, next).catch(() => {});
    }
  };

  const handleToggleVideo = async () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next));
    }
    if (selfParticipantId) {
      await api.toggleVideo(selfParticipantId, next).catch(() => {});
    }
  };

  const handleLeave = async () => {
    if (selfParticipantId) {
      await api.leaveParticipant(selfParticipantId).catch(() => {});
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.push("/");
  };

  const handleEndForAll = async () => {
    await api.updateMeetingStatus(meetingId, "ended").catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.push("/");
  };

  const handleMuteAll = async () => {
    try {
      await api.muteAllParticipants(meetingId);
      const updated = await api.getParticipants(meetingId);
      setParticipants(updated);
    } catch { /* silently fail */ }
  };

  const refreshParticipants = async () => {
    const updated = await api.getParticipants(meetingId).catch(() => [] as Participant[]);
    setParticipants(updated);
  };

  const handleCopyId = async () => {
    await copyToClipboard(meeting?.invite_link ?? "");
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const selfParticipant = participants.find((p) => p.id === selfParticipantId);
  const amHost = selfParticipant?.role === "host" || isHost;

  if (loading) {
    return (
      <div className="min-h-screen bg-zoom-dark flex items-center justify-center">
        <Spinner className="w-8 h-8 border-white border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zoom-dark flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-lg font-medium">Meeting not found</p>
        <p className="text-sm text-white/60">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-zoom-blue rounded-lg text-sm"
        >
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zoom-dark flex flex-col">
      {/* Top bar */}
      <div className="bg-zoom-darker h-14 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Lock size={14} />
          <span className="hidden sm:inline">Zoom Meeting</span>
        </div>

        <button
          onClick={handleCopyId}
          className="flex items-center gap-2 bg-zoom-panel hover:bg-zoom-tile text-white text-xs px-3 py-1.5 rounded-full font-mono transition-colors"
        >
          {meetingId}
          {idCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        </button>

        <div className="w-24 text-right">
          {meeting?.status === "active" && (
            <span className="text-xs text-zoom-red font-medium animate-pulse">● REC</span>
          )}
        </div>
      </div>

      {/* Video area */}
      <div className={`flex flex-1 overflow-hidden ${showParticipants ? "mr-72" : ""}`}>
        <VideoGrid
          participants={participants}
          selfParticipantId={selfParticipantId}
          videoRef={videoRef}
          isVideoOff={isVideoOff}
        />
      </div>

      {/* Controls */}
      <MeetingControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isHost={amHost}
        showParticipants={showParticipants}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleParticipants={() => setShowParticipants((v) => !v)}
        onLeave={handleLeave}
        onEndForAll={amHost ? handleEndForAll : undefined}
      />

      {/* Participants panel */}
      {showParticipants && (
        <ParticipantsPanel
          participants={participants}
          isHost={amHost}
          meetingId={meetingId}
          selfParticipantId={selfParticipantId}
          onClose={() => setShowParticipants(false)}
          onMuteAll={handleMuteAll}
          onParticipantsChange={refreshParticipants}
        />
      )}

      {/* Join modal */}
      <JoinNameModal
        meetingId={meetingId}
        meetingTitle={meeting?.title}
        isOpen={showJoinModal}
        onJoin={handleJoin}
        loading={joining}
      />
      {joinError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zoom-red text-white text-sm px-4 py-2 rounded-lg">
          {joinError}
        </div>
      )}
    </div>
  );
}

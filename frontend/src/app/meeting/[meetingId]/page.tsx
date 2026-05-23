"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Lock } from "lucide-react";

import ChatPanel from "@/components/meeting/ChatPanel";
import MeetingControls from "@/components/meeting/MeetingControls";
import ParticipantsPanel from "@/components/meeting/ParticipantsPanel";
import VideoGrid from "@/components/meeting/VideoGrid";
import Whiteboard from "@/components/meeting/Whiteboard";
import JoinNameModal from "@/components/modals/JoinNameModal";
import Spinner from "@/components/ui/Spinner";
import { useChat } from "@/hooks/useChat";
import { useMeeting } from "@/hooks/useMeeting";
import { useRecording } from "@/hooks/useRecording";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";
import { copyToClipboard, setStoredName } from "@/lib/utils";
import { buildMeetingWsUrl } from "@/lib/ws";

type Panel = "none" | "participants" | "chat" | "whiteboard";

export default function MeetingRoomPage() {
  const params = useParams<{ meetingId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = params.meetingId;

  const urlPid = searchParams.get("pid");
  const initialPid = urlPid ? Number(urlPid) : null;
  const initialIsHost = searchParams.get("host") === "1";

  const [participantId, setParticipantId] = useState<number | null>(initialPid);
  const [showJoinModal, setShowJoinModal] = useState(initialPid == null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [panel, setPanel] = useState<Panel>("none");
  const [idCopied, setIdCopied] = useState(false);
  const [recordingByClient, setRecordingByClient] = useState<Set<number>>(
    new Set()
  );

  const wsUrl = useMemo(
    () =>
      participantId != null && meetingId
        ? buildMeetingWsUrl(meetingId, participantId)
        : null,
    [meetingId, participantId]
  );

  const { send, subscribe, status: wsStatus } = useWebSocket(wsUrl);
  const { meeting, participants, loading, error } = useMeeting(
    meetingId,
    subscribe
  );

  const rtc = useWebRTC({ participantId, send, subscribe });
  const { messages, sendMessage } = useChat({ send, subscribe });
  const recording = useRecording({
    meetingId,
    participantId,
    stream: rtc.localStream,
    send,
    meetingTitle: meeting?.title ?? "Meeting",
  });

  // Side-effect WS messages that affect the page directly.
  useEffect(() => {
    return subscribe((msg) => {
      switch (msg.type) {
        case "recording-started":
          setRecordingByClient((prev) => {
            const next = new Set(prev);
            next.add(msg.payload.clientId);
            return next;
          });
          break;
        case "recording-stopped":
          setRecordingByClient((prev) => {
            const next = new Set(prev);
            next.delete(msg.payload.clientId);
            return next;
          });
          break;
        case "removed":
          rtc.cleanup();
          router.push("/?notice=removed");
          break;
        case "meeting-ended":
          rtc.cleanup();
          router.push("/?notice=ended");
          break;
        default:
          break;
      }
    });
  }, [subscribe, router, rtc]);

  // Start camera once we have a participant id.
  useEffect(() => {
    if (participantId != null) {
      void rtc.startCamera();
    }
    // rtc.startCamera identity is stable via useCallback; intentional dep choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  const isRecordingActive =
    recording.isRecording || recordingByClient.size > 0;

  const handleJoin = async (displayName: string) => {
    setJoining(true);
    setJoinError("");
    try {
      const res = await api.joinMeeting(meetingId, displayName);
      setStoredName(displayName);
      setParticipantId(res.participant.id);
      setShowJoinModal(false);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Failed to join.");
      setJoining(false);
    }
  };

  const selfParticipant = participants.find((p) => p.id === participantId);
  const amHost = selfParticipant?.role === "host" || initialIsHost;

  const handleLeave = () => {
    rtc.cleanup();
    router.push("/");
  };

  const handleEndForAll = async () => {
    try {
      await api.updateMeetingStatus(meetingId, "ended");
    } catch (err) {
      console.error("End meeting failed:", err);
    }
    rtc.cleanup();
    router.push("/");
  };

  const handleMuteAll = () => send({ type: "host-mute-all", payload: {} });

  const handleRemoveParticipant = (targetId: number) =>
    send({ type: "host-remove", payload: { targetClientId: targetId } });

  const handleCopyId = async () => {
    await copyToClipboard(meeting?.invite_link ?? meetingId);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const togglePanel = (next: Panel) =>
    setPanel((cur) => (cur === next ? "none" : next));

  const handleToggleScreenShare = () => {
    if (rtc.isScreenSharing) void rtc.stopScreenShare();
    else void rtc.startScreenShare();
  };

  const handleToggleRecording = () => {
    if (recording.isRecording) recording.stop();
    else recording.start();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zoom-dark flex items-center justify-center">
        <Spinner className="w-8 h-8 border-white border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zoom-dark flex flex-col items-center justify-center gap-4 text-white p-6">
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
          {idCopied ? (
            <Check size={12} className="text-green-400" />
          ) : (
            <Copy size={12} />
          )}
        </button>
        <div className="w-24 text-right">
          {isRecordingActive && (
            <span className="text-xs text-zoom-red font-medium animate-pulse">
              ● REC
            </span>
          )}
        </div>
      </div>

      {/* Banners */}
      {rtc.permissionError && (
        <div className="bg-amber-600 text-white text-sm px-4 py-2 text-center">
          {rtc.permissionError}{" "}
          <button
            onClick={() => void rtc.startCamera()}
            className="underline ml-2"
          >
            Try again
          </button>
        </div>
      )}
      {wsStatus === "closed" && participantId != null && (
        <div className="bg-zoom-red text-white text-sm px-4 py-2 text-center">
          Disconnected — trying to reconnect…
        </div>
      )}
      {recording.error && (
        <div className="bg-zoom-red text-white text-sm px-4 py-2 text-center">
          Recording error: {recording.error}
        </div>
      )}

      {/* Video grid */}
      <div className="flex flex-1 overflow-hidden">
        <VideoGrid
          participants={participants}
          selfParticipantId={participantId}
          localStream={rtc.localStream}
          remoteStreams={rtc.remoteStreams}
          isMuted={rtc.isMuted}
          isVideoOff={rtc.isVideoOff}
          screenSharingClientId={rtc.screenSharingClientId}
        />
      </div>

      {/* Controls */}
      <MeetingControls
        isMuted={rtc.isMuted}
        isVideoOff={rtc.isVideoOff}
        isHost={amHost}
        isScreenSharing={rtc.isScreenSharing}
        isRecording={recording.isRecording}
        activePanel={panel}
        onToggleMute={rtc.toggleMute}
        onToggleVideo={rtc.toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleParticipants={() => togglePanel("participants")}
        onToggleChat={() => togglePanel("chat")}
        onToggleWhiteboard={() => togglePanel("whiteboard")}
        onToggleRecording={handleToggleRecording}
        onLeave={handleLeave}
        onEndForAll={amHost ? handleEndForAll : undefined}
      />

      {/* Panels — Sheet portals; always mounted, open state drives visibility */}
      <ParticipantsPanel
        isOpen={panel === "participants"}
        participants={participants}
        isHost={amHost}
        selfParticipantId={participantId}
        onClose={() => setPanel("none")}
        onMuteAll={handleMuteAll}
        onRemove={handleRemoveParticipant}
      />
      <ChatPanel
        isOpen={panel === "chat"}
        messages={messages}
        selfClientId={participantId}
        onSend={sendMessage}
        onClose={() => setPanel("none")}
      />
      {panel === "whiteboard" && (
        <Whiteboard
          send={send}
          subscribe={subscribe}
          selfClientId={participantId}
          onClose={() => setPanel("none")}
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

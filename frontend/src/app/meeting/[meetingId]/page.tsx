"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Lock, X } from "lucide-react";

import ChatPanel from "@/components/meeting/ChatPanel";
import MeetingControls from "@/components/meeting/MeetingControls";
import ParticipantsPanel from "@/components/meeting/ParticipantsPanel";
import VideoGrid from "@/components/meeting/VideoGrid";
import Whiteboard from "@/components/meeting/Whiteboard";
import JoinNameModal from "@/components/modals/JoinNameModal";
import UserAvatar from "@/components/ui/UserAvatar";
import Spinner from "@/components/ui/Spinner";
import { useChat } from "@/hooks/useChat";
import { useMeeting } from "@/hooks/useMeeting";
import { useRecording } from "@/hooks/useRecording";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";
import { copyToClipboard, getStoredName, setStoredName } from "@/lib/utils";
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
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [panel, setPanel] = useState<Panel>("none");
  const [idCopied, setIdCopied] = useState(false);
  const [recordingByClient, setRecordingByClient] = useState<Set<number>>(new Set());

  // Rename state
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const wsUrl = useMemo(
    () =>
      participantId != null && meetingId
        ? buildMeetingWsUrl(meetingId, participantId)
        : null,
    [meetingId, participantId]
  );

  const { send, subscribe, status: wsStatus } = useWebSocket(wsUrl);
  const { meeting, participants, loading, error } = useMeeting(meetingId, subscribe);

  const rtc = useWebRTC({ participantId, send, subscribe });
  const { messages, sendMessage } = useChat({ send, subscribe });
  const recording = useRecording({
    meetingId,
    participantId,
    stream: rtc.localStream,
    send,
    meetingTitle: meeting?.title ?? "Meeting",
  });

  // Auto-join with stored name if no participantId yet
  useEffect(() => {
    if (initialPid != null) return;
    const stored = getStoredName();
    if (!stored) {
      setShowJoinModal(true);
      return;
    }
    setJoining(true);
    api
      .joinMeeting(meetingId, stored)
      .then((res) => {
        setParticipantId(res.participant.id);
        setShowJoinModal(false);
      })
      .catch(() => {
        setShowJoinModal(true);
      })
      .finally(() => setJoining(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WS messages affecting the page directly
  useEffect(() => {
    return subscribe((msg) => {
      switch (msg.type) {
        case "recording-started":
          setRecordingByClient((prev) => new Set(prev).add(msg.payload.clientId));
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

  // Start camera once participantId is known
  useEffect(() => {
    if (participantId != null) void rtc.startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  const isRecordingActive = recording.isRecording || recordingByClient.size > 0;

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

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || participantId == null) return;
    setRenaming(true);
    try {
      await api.renameParticipant(participantId, trimmed);
      setStoredName(trimmed);
      send({ type: "peer-rename", payload: { displayName: trimmed } });
      setShowRename(false);
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setRenaming(false);
    }
  };

  const openRename = () => {
    const self = participants.find((p) => p.id === participantId);
    setRenameValue(self?.display_name ?? getStoredName() ?? "");
    setShowRename(true);
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
      <div className="h-screen bg-zoom-dark flex items-center justify-center">
        <Spinner className="w-8 h-8 border-white border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-zoom-dark flex flex-col items-center justify-center gap-4 text-white p-6">
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
    <div className="h-screen bg-zoom-dark flex flex-col overflow-hidden">
      {/* Fixed top bar */}
      <div className="bg-zoom-darker border-b border-white/5 h-14 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <Lock size={13} className="text-white/40" />
          <span className="text-white/70 text-sm font-medium truncate max-w-48 hidden sm:block">
            {meeting?.title ?? "Meeting"}
          </span>
          {isRecordingActive && (
            <span className="text-xs text-zoom-red font-semibold animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-zoom-red rounded-full inline-block" />
              REC
            </span>
          )}
        </div>

        <button
          onClick={handleCopyId}
          className="flex items-center gap-2 bg-zoom-panel hover:bg-zoom-tile text-white/80 hover:text-white text-xs px-3 py-1.5 rounded-full font-mono transition-colors"
        >
          {meetingId}
          {idCopied ? (
            <Check size={12} className="text-green-400" />
          ) : (
            <Copy size={12} className="text-white/50" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {selfParticipant && (
            <div className="hidden sm:flex items-center gap-2">
              <UserAvatar name={selfParticipant.display_name} size={28} />
              <span className="text-white/60 text-xs">{selfParticipant.display_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Banners */}
      {rtc.permissionError && (
        <div className="bg-amber-600 text-white text-sm px-4 py-2 text-center shrink-0">
          {rtc.permissionError}{" "}
          <button onClick={() => void rtc.startCamera()} className="underline ml-2">
            Try again
          </button>
        </div>
      )}
      {wsStatus === "closed" && participantId != null && (
        <div className="bg-zoom-red text-white text-sm px-4 py-2 text-center shrink-0">
          Disconnected — trying to reconnect…
        </div>
      )}
      {recording.error && (
        <div className="bg-zoom-red text-white text-sm px-4 py-2 text-center shrink-0">
          Recording error: {recording.error}
        </div>
      )}

      {/* Video grid — fills remaining space */}
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

      {/* Fixed bottom controls */}
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
        onRename={openRename}
        onLeave={handleLeave}
        onEndForAll={amHost ? handleEndForAll : undefined}
      />

      {/* Side panels — Sheet portals */}
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

      {/* Join modal (fallback when no stored name) */}
      <JoinNameModal
        meetingId={meetingId}
        meetingTitle={meeting?.title}
        isOpen={showJoinModal}
        onJoin={handleJoin}
        loading={joining}
      />
      {joinError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zoom-red text-white text-sm px-4 py-2 rounded-lg z-50">
          {joinError}
        </div>
      )}

      {/* Rename modal */}
      {showRename && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zoom-panel rounded-2xl w-full max-w-xs p-6 border border-white/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-sm">Change your name</h3>
              <button
                onClick={() => setShowRename(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <UserAvatar name={renameValue || "?"} size={48} />
            </div>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !renaming && handleRename()}
              placeholder="Your display name"
              maxLength={50}
              autoFocus
              className="w-full bg-white/10 text-white text-sm placeholder:text-white/40 rounded-xl px-3 py-2.5 outline-none focus:bg-white/15 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowRename(false)}
                className="flex-1 border border-white/20 text-white/70 hover:text-white rounded-xl py-2 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!renameValue.trim() || renaming}
                className="flex-1 bg-zoom-blue hover:bg-zoom-blue-h text-white rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {renaming ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

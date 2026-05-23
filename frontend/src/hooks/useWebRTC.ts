"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import type { IncomingWSMessage, OutgoingWSMessage } from "@/lib/ws";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface UseWebRTCArgs {
  participantId: number | null;
  send: (msg: OutgoingWSMessage) => void;
  subscribe: (handler: (msg: IncomingWSMessage) => void) => () => void;
}

export interface UseWebRTCResult {
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  permissionError: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  screenSharingClientId: number | null;
  startCamera: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  cleanup: () => void;
}

export function useWebRTC({
  participantId,
  send,
  subscribe,
}: UseWebRTCArgs): UseWebRTCResult {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(
    new Map()
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [screenSharingClientId, setScreenSharingClientId] = useState<
    number | null
  >(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const participantIdRef = useRef(participantId);

  useEffect(() => {
    participantIdRef.current = participantId;
  }, [participantId]);

  const setRemote = useCallback(
    (peerId: number, stream: MediaStream | null) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        if (stream) next.set(peerId, stream);
        else next.delete(peerId);
        return next;
      });
    },
    []
  );

  const closePeer = useCallback(
    (peerId: number) => {
      const pc = peersRef.current.get(peerId);
      if (pc) {
        try {
          pc.close();
        } catch {
          /* ignore */
        }
      }
      peersRef.current.delete(peerId);
      setRemote(peerId, null);
    },
    [setRemote]
  );

  const createPeerConnection = useCallback(
    (peerId: number): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      const stream = localStreamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) pc.addTrack(track, stream);
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send({
            type: "rtc-ice",
            payload: { to: peerId, candidate: event.candidate.toJSON() },
          });
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] ?? new MediaStream([event.track]);
        setRemote(peerId, remoteStream);
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "failed" || state === "closed" || state === "disconnected") {
          closePeer(peerId);
        }
      };

      peersRef.current.set(peerId, pc);
      return pc;
    },
    [closePeer, send, setRemote]
  );

  const initiateOffer = useCallback(
    async (peerId: number) => {
      let pc = peersRef.current.get(peerId);
      if (!pc) pc = createPeerConnection(peerId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: "rtc-offer", payload: { to: peerId, sdp: offer } });
      } catch (err) {
        console.error("createOffer failed for peer", peerId, err);
      }
    },
    [createPeerConnection, send]
  );

  const handleOffer = useCallback(
    async (from: number, sdp: RTCSessionDescriptionInit) => {
      let pc = peersRef.current.get(from);
      if (!pc) pc = createPeerConnection(from);
      try {
        await pc.setRemoteDescription(sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: "rtc-answer", payload: { to: from, sdp: answer } });
      } catch (err) {
        console.error("handleOffer failed", from, err);
      }
    },
    [createPeerConnection, send]
  );

  const handleAnswer = useCallback(
    async (from: number, sdp: RTCSessionDescriptionInit) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(sdp);
      } catch (err) {
        console.error("setRemoteDescription (answer) failed", err);
      }
    },
    []
  );

  const handleIce = useCallback(
    async (from: number, candidate: RTCIceCandidateInit) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn("addIceCandidate failed", err);
      }
    },
    []
  );

  const startCamera = useCallback(async () => {
    if (localStreamRef.current) return; // idempotent
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      cameraVideoTrackRef.current = stream.getVideoTracks()[0] ?? null;
      setLocalStream(stream);
      setPermissionError(null);
      // If peers already exist (rare race), attach tracks now.
      for (const [, pc] of peersRef.current) {
        for (const track of stream.getTracks()) {
          if (!pc.getSenders().some((s) => s.track?.id === track.id)) {
            pc.addTrack(track, stream);
          }
        }
      }
    } catch (err) {
      const name = (err as DOMException | null)?.name ?? "";
      setPermissionError(
        name === "NotAllowedError"
          ? "Camera and microphone access were denied. Enable them in your browser settings and rejoin."
          : "Could not access your camera or microphone."
      );
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    const stream = localStreamRef.current;
    if (stream) {
      for (const t of stream.getAudioTracks()) t.enabled = !next;
    }
    send({ type: "state-update", payload: { isMuted: next } });
  }, [isMuted, send]);

  const toggleVideo = useCallback(() => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    const stream = localStreamRef.current;
    if (stream) {
      for (const t of stream.getVideoTracks()) t.enabled = !next;
    }
    send({ type: "state-update", payload: { isVideoOff: next } });
  }, [isVideoOff, send]);

  // forward declaration so onended handler can call stopScreenShare
  const stopScreenShareRef = useRef<() => Promise<void>>(async () => {});

  const startScreenShare = useCallback(async () => {
    if (screenStreamRef.current) return;
    let screen: MediaStream;
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
    } catch (err) {
      console.warn("Screen share request cancelled", err);
      return;
    }
    screenStreamRef.current = screen;
    const screenTrack = screen.getVideoTracks()[0];
    if (!screenTrack) {
      screenStreamRef.current = null;
      return;
    }

    for (const [, pc] of peersRef.current) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        try {
          await sender.replaceTrack(screenTrack);
        } catch (err) {
          console.error("replaceTrack failed", err);
        }
      }
    }

    if (localStreamRef.current && cameraVideoTrackRef.current) {
      localStreamRef.current.removeTrack(cameraVideoTrackRef.current);
      localStreamRef.current.addTrack(screenTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }

    screenTrack.onended = () => {
      void stopScreenShareRef.current();
    };

    if (participantIdRef.current != null) {
      setScreenSharingClientId(participantIdRef.current);
    }
    send({ type: "state-update", payload: { isScreenSharing: true } });
  }, [send]);

  const stopScreenShare = useCallback(async () => {
    const screen = screenStreamRef.current;
    if (!screen) return;
    for (const t of screen.getTracks()) t.stop();
    screenStreamRef.current = null;

    const camTrack = cameraVideoTrackRef.current;
    if (camTrack) {
      for (const [, pc] of peersRef.current) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          try {
            await sender.replaceTrack(camTrack);
          } catch {
            /* ignore */
          }
        }
      }
      if (localStreamRef.current) {
        for (const t of localStreamRef.current.getVideoTracks()) {
          if (t.id !== camTrack.id) localStreamRef.current.removeTrack(t);
        }
        if (
          !localStreamRef.current.getVideoTracks().some((t) => t.id === camTrack.id)
        ) {
          localStreamRef.current.addTrack(camTrack);
        }
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    }

    setScreenSharingClientId((cid) =>
      cid === participantIdRef.current ? null : cid
    );
    send({ type: "state-update", payload: { isScreenSharing: false } });
  }, [send]);

  useEffect(() => {
    stopScreenShareRef.current = stopScreenShare;
  }, [stopScreenShare]);

  // Subscribe to WS messages
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      switch (msg.type) {
        case "room-state": {
          for (const peer of msg.payload.peers) void initiateOffer(peer.clientId);
          break;
        }
        case "peer-left": {
          closePeer(msg.payload.clientId);
          break;
        }
        case "rtc-offer": {
          void handleOffer(msg.payload.from, msg.payload.sdp);
          break;
        }
        case "rtc-answer": {
          void handleAnswer(msg.payload.from, msg.payload.sdp);
          break;
        }
        case "rtc-ice": {
          void handleIce(msg.payload.from, msg.payload.candidate);
          break;
        }
        case "state-update": {
          if (msg.payload.isScreenSharing === true) {
            setScreenSharingClientId(msg.payload.clientId);
          } else if (msg.payload.isScreenSharing === false) {
            setScreenSharingClientId((cid) =>
              cid === msg.payload.clientId ? null : cid
            );
          }
          break;
        }
        case "force-mute": {
          setIsMuted(true);
          const stream = localStreamRef.current;
          if (stream) {
            for (const t of stream.getAudioTracks()) t.enabled = false;
          }
          break;
        }
        default:
          break;
      }
    });
    return unsubscribe;
  }, [subscribe, initiateOffer, closePeer, handleOffer, handleAnswer, handleIce]);

  const cleanup = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) for (const t of stream.getTracks()) t.stop();
    const screen = screenStreamRef.current;
    if (screen) for (const t of screen.getTracks()) t.stop();
    for (const [, pc] of peersRef.current) {
      try {
        pc.close();
      } catch {
        /* ignore */
      }
    }
    peersRef.current.clear();
    localStreamRef.current = null;
    screenStreamRef.current = null;
    cameraVideoTrackRef.current = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    localStream,
    remoteStreams,
    permissionError,
    isMuted,
    isVideoOff,
    isScreenSharing: screenSharingClientId === participantId,
    screenSharingClientId,
    startCamera,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanup,
  };
}

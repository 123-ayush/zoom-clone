// WebSocket message catalog — mirrors backend/app/ws/router.py.
// All wire messages are `{ type, payload }` JSON objects.

export interface PeerInfo {
  clientId: number;
  displayName: string;
  role: "host" | "participant";
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface WSChatMessage {
  id: number;
  clientId: number | null;
  displayName: string;
  body: string;
  createdAt: string;
}

export interface WhiteboardStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: "pen" | "eraser";
}

type Empty = Record<string, never>;

export type IncomingWSMessage =
  | {
      type: "room-state";
      payload: { peers: PeerInfo[]; chatHistory: WSChatMessage[] };
    }
  | { type: "peer-joined"; payload: PeerInfo }
  | { type: "peer-left"; payload: { clientId: number } }
  | {
      type: "state-update";
      payload: {
        clientId: number;
        isMuted?: boolean;
        isVideoOff?: boolean;
        isScreenSharing?: boolean;
      };
    }
  | { type: "chat-message"; payload: WSChatMessage }
  | { type: "meeting-ended"; payload: { meetingId: string } }
  | { type: "error"; payload: { code: string; message: string } }
  | { type: "force-mute"; payload: Empty }
  | { type: "removed"; payload: Empty }
  | {
      type: "rtc-offer";
      payload: { from: number; to: number; sdp: RTCSessionDescriptionInit };
    }
  | {
      type: "rtc-answer";
      payload: { from: number; to: number; sdp: RTCSessionDescriptionInit };
    }
  | {
      type: "rtc-ice";
      payload: { from: number; to: number; candidate: RTCIceCandidateInit };
    }
  | {
      type: "wb-stroke";
      payload: WhiteboardStroke & { from: number };
    }
  | { type: "wb-clear"; payload: { from: number } }
  | { type: "wb-snapshot-request"; payload: { from: number } }
  | {
      type: "wb-snapshot";
      payload: { from: number; to: number; dataUrl: string };
    }
  | {
      type: "recording-started";
      payload: { clientId: number; recordingId?: number };
    }
  | {
      type: "recording-stopped";
      payload: { clientId: number; recordingId?: number };
    }
  | {
      type: "peer-renamed";
      payload: { clientId: number; displayName: string };
    };

export type OutgoingWSMessage =
  | {
      type: "state-update";
      payload: {
        isMuted?: boolean;
        isVideoOff?: boolean;
        isScreenSharing?: boolean;
      };
    }
  | { type: "chat-send"; payload: { body: string } }
  | { type: "host-mute-all"; payload: Empty }
  | { type: "host-remove"; payload: { targetClientId: number } }
  | { type: "wb-stroke"; payload: WhiteboardStroke }
  | { type: "wb-clear"; payload: Empty }
  | { type: "wb-snapshot-request"; payload: Empty }
  | { type: "wb-snapshot"; payload: { to: number; dataUrl: string } }
  | {
      type: "rtc-offer";
      payload: { to: number; sdp: RTCSessionDescriptionInit };
    }
  | {
      type: "rtc-answer";
      payload: { to: number; sdp: RTCSessionDescriptionInit };
    }
  | {
      type: "rtc-ice";
      payload: { to: number; candidate: RTCIceCandidateInit };
    }
  | { type: "recording-started"; payload: { recordingId?: number } }
  | { type: "recording-stopped"; payload: { recordingId?: number } }
  | { type: "peer-rename"; payload: { displayName: string } };

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ??
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
    /^http/,
    "ws"
  );

export function buildMeetingWsUrl(
  meetingId: string,
  participantId: number
): string {
  return `${WS_BASE}/ws/meetings/${meetingId}?participant_id=${participantId}`;
}

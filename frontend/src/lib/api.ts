import type {
  ChatMessage,
  JoinMeetingResponse,
  Meeting,
  MeetingListResponse,
  Participant,
  Recording,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail?.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  // Don't set Content-Type — the browser sets the multipart boundary.
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: formData });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail?.detail ?? "Upload failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  listMeetings: () => request<MeetingListResponse>("/api/meetings"),

  getMeeting: (meetingId: string) =>
    request<Meeting>(`/api/meetings/${meetingId}`),

  createInstantMeeting: () =>
    request<JoinMeetingResponse>("/api/meetings/instant", { method: "POST" }),

  scheduleMeeting: (data: {
    title: string;
    description?: string;
    scheduled_at: string;
    duration_mins: number;
  }) =>
    request<Meeting>("/api/meetings/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateMeetingStatus: (meetingId: string, status: string) =>
    request<Meeting>(`/api/meetings/${meetingId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  joinMeeting: (meetingId: string, displayName: string) =>
    request<JoinMeetingResponse>(`/api/meetings/${meetingId}/join`, {
      method: "POST",
      body: JSON.stringify({ display_name: displayName }),
    }),

  getParticipants: (meetingId: string) =>
    request<Participant[]>(`/api/meetings/${meetingId}/participants`),

  muteAllParticipants: (meetingId: string) =>
    request<{ updated_count: number }>(
      `/api/meetings/${meetingId}/mute-all`,
      { method: "PATCH", body: JSON.stringify({ is_muted: true }) }
    ),

  removeParticipant: (meetingId: string, participantId: number) =>
    request<{ message: string }>(
      `/api/meetings/${meetingId}/participants/${participantId}`,
      { method: "DELETE" }
    ),

  muteParticipant: (participantId: number, isMuted: boolean) =>
    request<Participant>(`/api/participants/${participantId}/mute`, {
      method: "PATCH",
      body: JSON.stringify({ is_muted: isMuted }),
    }),

  toggleVideo: (participantId: number, isVideoOff: boolean) =>
    request<Participant>(`/api/participants/${participantId}/video`, {
      method: "PATCH",
      body: JSON.stringify({ is_video_off: isVideoOff }),
    }),

  leaveParticipant: (participantId: number) =>
    request<Participant>(`/api/participants/${participantId}/leave`, {
      method: "PATCH",
    }),

  deleteMeeting: (meetingId: string) =>
    request<{ message: string }>(`/api/meetings/${meetingId}`, {
      method: "DELETE",
    }),

  getChat: (meetingId: string) =>
    request<ChatMessage[]>(`/api/meetings/${meetingId}/chat`),

  listRecordings: () => request<Recording[]>("/api/recordings"),

  deleteRecording: (id: number) =>
    request<{ message: string }>(`/api/recordings/${id}`, { method: "DELETE" }),

  uploadRecording: (
    meetingId: string,
    blob: Blob,
    title: string,
    durationSecs: number,
    participantId?: number
  ) => {
    const fd = new FormData();
    fd.append("file", blob, `${meetingId}.webm`);
    fd.append("title", title);
    fd.append("duration_secs", String(durationSecs));
    if (participantId != null) fd.append("participant_id", String(participantId));
    return requestForm<Recording>(
      `/api/meetings/${meetingId}/recordings`,
      fd
    );
  },
};

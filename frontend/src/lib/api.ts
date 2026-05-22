import type {
  Meeting,
  MeetingListResponse,
  JoinMeetingResponse,
  Participant,
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
  return res.json() as Promise<T>;
}

export const api = {
  listMeetings: () => request<MeetingListResponse>("/api/meetings"),

  getMeeting: (meetingId: string) =>
    request<Meeting>(`/api/meetings/${meetingId}`),

  createInstantMeeting: (hostName: string) =>
    request<JoinMeetingResponse>("/api/meetings/instant", {
      method: "POST",
      body: JSON.stringify({ host_name: hostName }),
    }),

  scheduleMeeting: (data: {
    title: string;
    description?: string;
    scheduled_at: string;
    duration_mins: number;
  }) =>
    request<Meeting>("/api/meetings/schedule", {
      method: "POST",
      body: JSON.stringify({ ...data, host_name: "Default User" }),
    }),

  updateMeetingStatus: (meetingId: string, status: string) =>
    request<Meeting>(`/api/meetings/${meetingId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  joinMeeting: (meetingId: string, displayName: string, userId?: number) =>
    request<JoinMeetingResponse>(`/api/meetings/${meetingId}/join`, {
      method: "POST",
      body: JSON.stringify({ display_name: displayName, user_id: userId ?? null }),
    }),

  getParticipants: (meetingId: string) =>
    request<Participant[]>(`/api/meetings/${meetingId}/participants`),

  muteAllParticipants: (meetingId: string) =>
    request<{ updated_count: number }>(`/api/meetings/${meetingId}/mute-all`, {
      method: "PATCH",
      body: JSON.stringify({ is_muted: true }),
    }),

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
};

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Meeting {
  id: number;
  meeting_id: string;
  title: string;
  description: string | null;
  host_id: number;
  type: "instant" | "scheduled";
  status: "waiting" | "active" | "ended";
  scheduled_at: string | null;
  duration_mins: number;
  invite_link: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  participant_count: number;
}

export interface Participant {
  id: number;
  meeting_id: number;
  user_id: number | null;
  display_name: string;
  role: "host" | "participant";
  is_muted: boolean;
  is_video_off: boolean;
  joined_at: string;
  left_at: string | null;
}

export interface MeetingListResponse {
  upcoming: Meeting[];
  recent: Meeting[];
}

export interface JoinMeetingResponse {
  meeting: Meeting;
  participant: Participant;
}

export interface ChatMessage {
  id: number;
  meeting_id: number;
  participant_id: number | null;
  display_name: string;
  body: string;
  created_at: string;
}

export interface Recording {
  id: number;
  meeting_id: number;
  title: string;
  duration_secs: number;
  size_bytes: number;
  status: string;
  created_at: string;
  url: string;
}

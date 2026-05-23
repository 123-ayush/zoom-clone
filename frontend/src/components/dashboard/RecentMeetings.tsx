import type { Meeting } from "@/types";
import MeetingCard from "./MeetingCard";
import Spinner from "@/components/ui/Spinner";
import { History } from "lucide-react";

interface Props {
  meetings: Meeting[];
  loading: boolean;
}

export default function RecentMeetings({ meetings, loading }: Props) {
  return (
    <div className="bg-zoom-card rounded-2xl shadow-sm border border-zoom-border p-6">
      <h2 className="text-base font-semibold text-zoom-text mb-4">Recent Meetings</h2>
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-zoom-muted">
          <History size={32} className="opacity-40" />
          <p className="text-sm">No recent meetings</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {meetings.map((m) => (
            <MeetingCard key={m.id} meeting={m} variant="recent" />
          ))}
        </div>
      )}
    </div>
  );
}

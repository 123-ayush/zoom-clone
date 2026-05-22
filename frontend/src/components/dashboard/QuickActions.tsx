"use client";
import { useRouter } from "next/navigation";
import { Video, UserPlus, CalendarPlus, Monitor } from "lucide-react";
import { api } from "@/lib/api";
import { useState } from "react";
import Spinner from "@/components/ui/Spinner";

interface Action {
  icon: React.ReactNode;
  label: string;
  bg: string;
  iconBg: string;
  onClick: () => void;
  loading?: boolean;
}

export default function QuickActions() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleNewMeeting = async () => {
    setCreating(true);
    try {
      const res = await api.createInstantMeeting("Default User");
      router.push(`/meeting/${res.meeting.meeting_id}?host=1&pid=${res.participant.id}`);
    } catch {
      setCreating(false);
    }
  };

  const actions: Action[] = [
    {
      icon: creating ? <Spinner className="w-7 h-7" /> : <Video size={28} className="text-white" />,
      label: "New Meeting",
      bg: "bg-orange-50 hover:bg-orange-100",
      iconBg: "bg-zoom-orange",
      onClick: handleNewMeeting,
      loading: creating,
    },
    {
      icon: <UserPlus size={28} className="text-white" />,
      label: "Join",
      bg: "bg-blue-50 hover:bg-blue-100",
      iconBg: "bg-zoom-blue",
      onClick: () => router.push("/join"),
    },
    {
      icon: <CalendarPlus size={28} className="text-white" />,
      label: "Schedule",
      bg: "bg-blue-50 hover:bg-blue-100",
      iconBg: "bg-zoom-blue",
      onClick: () => router.push("/schedule"),
    },
    {
      icon: <Monitor size={28} className="text-white" />,
      label: "Share Screen",
      bg: "bg-gray-50 hover:bg-gray-100",
      iconBg: "bg-gray-400",
      onClick: () => {},
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zoom-border p-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.loading}
            className={`flex flex-col items-center gap-3 p-5 rounded-xl transition-colors cursor-pointer disabled:opacity-70 ${action.bg}`}
          >
            <div className={`w-14 h-14 rounded-full ${action.iconBg} flex items-center justify-center`}>
              {action.icon}
            </div>
            <span className="text-sm font-medium text-zoom-text">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

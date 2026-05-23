"use client";
import { useRouter } from "next/navigation";
import { CalendarPlus, Film, UserPlus, Video } from "lucide-react";
import { api } from "@/lib/api";
import { useState } from "react";
import Spinner from "@/components/ui/Spinner";
import { getStoredName } from "@/lib/utils";

export default function QuickActions() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleNewMeeting = async () => {
    const name = getStoredName();
    if (!name) return;
    setCreating(true);
    try {
      const res = await api.createInstantMeeting(name);
      router.push(`/meeting/${res.meeting.meeting_id}?host=1&pid=${res.participant.id}`);
    } catch (err) {
      console.error("Failed to start instant meeting:", err);
      setCreating(false);
    }
  };

  const actions = [
    {
      icon: creating ? (
        <Spinner className="w-6 h-6 border-white border-t-transparent" />
      ) : (
        <Video size={24} className="text-white" />
      ),
      label: "New Meeting",
      iconBg: "bg-zoom-orange",
      cardBg: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50",
      onClick: handleNewMeeting,
      loading: creating,
    },
    {
      icon: <UserPlus size={24} className="text-white" />,
      label: "Join",
      iconBg: "bg-zoom-blue",
      cardBg: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50",
      onClick: () => router.push("/join"),
    },
    {
      icon: <CalendarPlus size={24} className="text-white" />,
      label: "Schedule",
      iconBg: "bg-zoom-blue",
      cardBg: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50",
      onClick: () => router.push("/schedule"),
    },
    {
      icon: <Film size={24} className="text-white" />,
      label: "Clips",
      iconBg: "bg-purple-500",
      cardBg: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50",
      onClick: () => router.push("/clips"),
    },
  ];

  return (
    <div className="bg-zoom-card rounded-2xl shadow-sm border border-zoom-border p-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.loading}
            className={`flex flex-col items-center gap-3 p-5 rounded-xl transition-colors cursor-pointer disabled:opacity-70 ${action.cardBg}`}
          >
            <div
              className={`w-12 h-12 rounded-2xl ${action.iconBg} flex items-center justify-center shadow-sm`}
            >
              {action.icon}
            </div>
            <span className="text-sm font-medium text-zoom-text">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

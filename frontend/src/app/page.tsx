"use client";
import Navbar from "@/components/layout/Navbar";
import QuickActions from "@/components/dashboard/QuickActions";
import UpcomingMeetings from "@/components/dashboard/UpcomingMeetings";
import RecentMeetings from "@/components/dashboard/RecentMeetings";
import { useMeetings } from "@/hooks/useMeetings";

export default function DashboardPage() {
  const { upcoming, recent, loading } = useMeetings();

  return (
    <div className="min-h-screen bg-zoom-surface flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-zoom-text mb-1">Good day!</h1>
          <p className="text-sm text-zoom-muted">What would you like to do?</p>
        </div>
        <QuickActions />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UpcomingMeetings meetings={upcoming} loading={loading} />
          <RecentMeetings meetings={recent} loading={loading} />
        </div>
      </main>
    </div>
  );
}

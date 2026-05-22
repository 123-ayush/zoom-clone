"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Meeting } from "@/types";

export function useMeetings() {
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.listMeetings();
      setUpcoming(data.upcoming);
      setRecent(data.recent);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { upcoming, recent, loading, error, refresh: load };
}

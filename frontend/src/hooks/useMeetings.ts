"use client";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Meeting } from "@/types";

export function useMeetings() {
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    api
      .listMeetings()
      .then((data) => {
        if (cancelled) return;
        setUpcoming(data.upcoming);
        setRecent(data.recent);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load meetings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { upcoming, recent, loading, error, refresh };
}

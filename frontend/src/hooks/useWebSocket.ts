"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import type { IncomingWSMessage, OutgoingWSMessage } from "@/lib/ws";

export type WSStatus = "idle" | "connecting" | "open" | "closed";

interface UseWebSocketResult {
  status: WSStatus;
  send: (msg: OutgoingWSMessage) => void;
  subscribe: (handler: (msg: IncomingWSMessage) => void) => () => void;
}

export function useWebSocket(url: string | null): UseWebSocketResult {
  const [status, setStatus] = useState<WSStatus>(url ? "connecting" : "idle");
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<(msg: IncomingWSMessage) => void>>(new Set());
  const queueRef = useRef<OutgoingWSMessage[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const send = useCallback((msg: OutgoingWSMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      queueRef.current.push(msg);
    }
  }, []);

  const subscribe = useCallback(
    (handler: (msg: IncomingWSMessage) => void) => {
      handlersRef.current.add(handler);
      return () => {
        handlersRef.current.delete(handler);
      };
    },
    []
  );

  useEffect(() => {
    if (!url) {
      // Initial state already reflects this; on transitions to null, the
      // previous effect's cleanup will land status on "closed" via onclose.
      return;
    }
    cancelledRef.current = false;

    const connect = () => {
      if (cancelledRef.current) return;
      setStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setStatus("open");
        const pending = queueRef.current.splice(0);
        for (const m of pending) {
          try {
            ws.send(JSON.stringify(m));
          } catch {
            queueRef.current.push(m);
          }
        }
      };

      ws.onmessage = (event) => {
        let msg: IncomingWSMessage | null = null;
        try {
          msg = JSON.parse(event.data) as IncomingWSMessage;
        } catch {
          return;
        }
        handlersRef.current.forEach((h) => {
          try {
            h(msg!);
          } catch (err) {
            console.error("WS handler error:", err);
          }
        });
      };

      ws.onerror = () => {
        // Errors are followed by `onclose`, which handles reconnect.
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        if (cancelledRef.current) {
          setStatus("closed");
          return;
        }
        // App-specific close codes (4xxx) mean don't reconnect — server rejected.
        if (event.code >= 4000 && event.code < 5000) {
          setStatus("closed");
          return;
        }
        setStatus("closed");
        const delay = Math.min(
          1000 * 2 ** reconnectAttemptsRef.current,
          15000
        );
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelledRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      wsRef.current = null;
      try {
        ws?.close(1000, "unmount");
      } catch {
        /* ignore */
      }
    };
  }, [url]);

  return { status, send, subscribe };
}

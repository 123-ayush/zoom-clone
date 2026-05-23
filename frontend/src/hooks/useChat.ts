"use client";
import { useCallback, useEffect, useState } from "react";

import type {
  IncomingWSMessage,
  OutgoingWSMessage,
  WSChatMessage,
} from "@/lib/ws";

interface UseChatArgs {
  send: (msg: OutgoingWSMessage) => void;
  subscribe: (handler: (msg: IncomingWSMessage) => void) => () => void;
}

export function useChat({ send, subscribe }: UseChatArgs) {
  const [messages, setMessages] = useState<WSChatMessage[]>([]);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === "room-state") {
        setMessages(msg.payload.chatHistory);
      } else if (msg.type === "chat-message") {
        setMessages((prev) => [...prev, msg.payload]);
      }
    });
  }, [subscribe]);

  const sendMessage = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      send({ type: "chat-send", payload: { body: trimmed } });
    },
    [send]
  );

  return { messages, sendMessage };
}

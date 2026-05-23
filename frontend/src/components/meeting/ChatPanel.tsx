"use client";
import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

import type { WSChatMessage } from "@/lib/ws";

interface Props {
  messages: WSChatMessage[];
  selfClientId: number | null;
  onSend: (body: string) => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatPanel({
  messages,
  selfClientId,
  onSend,
  onClose,
}: Props) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [messages.length]);

  const submit = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-zoom-panel border-l border-white/10 flex flex-col z-30">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white font-semibold text-sm">Chat</span>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors"
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-8">
            No messages yet.
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.clientId === selfClientId;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                <span className="text-xs text-white/50 mb-0.5">
                  {m.displayName}{" "}
                  <span className="text-white/30">· {formatTime(m.createdAt)}</span>
                </span>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm break-words ${
                    isMine ? "bg-zoom-blue text-white" : "bg-white/10 text-white"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-white/10 p-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Send a message"
          maxLength={2000}
          className="flex-1 bg-white/10 text-white text-sm placeholder:text-white/40 rounded-lg px-3 py-2 outline-none focus:bg-white/15"
        />
        <button
          onClick={submit}
          disabled={!input.trim()}
          className="bg-zoom-blue hover:bg-zoom-blue-h text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

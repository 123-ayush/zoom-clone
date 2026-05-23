"use client";
import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import type { WSChatMessage } from "@/lib/ws";

interface Props {
  isOpen: boolean;
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
  isOpen,
  messages,
  selfClientId,
  onSend,
  onClose,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isOpen]);

  const submit = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-80 data-[side=right]:w-80 data-[side=right]:sm:max-w-80 bg-zoom-panel border-l border-white/10 text-white flex flex-col p-0 gap-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <SheetTitle className="text-white text-sm font-semibold">Chat</SheetTitle>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
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
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm wrap-break-word ${
                      isMine
                        ? "bg-zoom-blue text-white rounded-tr-sm"
                        : "bg-white/10 text-white rounded-tl-sm"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/10 p-3 flex items-center gap-2 shrink-0">
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
      </SheetContent>
    </Sheet>
  );
}

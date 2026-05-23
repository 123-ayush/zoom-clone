"use client";
import { useEffect, useState } from "react";
import { getStoredName, setStoredName } from "@/lib/utils";
import UserAvatar from "@/components/ui/UserAvatar";

export default function GlobalNameSetup({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!getStoredName()) setShowModal(true);
  }, []);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStoredName(trimmed);
    setShowModal(false);
  };

  return (
    <>
      {children}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-zoom-card rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-zoom-border">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 bg-zoom-blue rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <span className="text-white font-bold text-2xl leading-none">Z</span>
              </div>
              <h2 className="text-xl font-semibold text-zoom-text">Welcome to Zoom</h2>
              <p className="text-sm text-zoom-muted text-center mt-1.5">
                What should we call you in meetings?
              </p>
            </div>

            <div className="mb-4">
              <div className="flex justify-center mb-4">
                <UserAvatar name={name || "?"} size={52} />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
                maxLength={50}
                autoFocus
                className="w-full border border-zoom-border rounded-xl px-4 py-3 text-sm text-zoom-text bg-zoom-card focus:outline-none focus:ring-2 focus:ring-zoom-blue focus:border-transparent placeholder:text-zoom-muted"
                onKeyDown={(e) => e.key === "Enter" && name.trim() && handleSave()}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="w-full bg-zoom-blue text-white rounded-xl py-3 text-sm font-semibold hover:bg-zoom-blue-h transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </>
  );
}

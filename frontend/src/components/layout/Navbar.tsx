"use client";
import Link from "next/link";
import { Bell, Settings, HelpCircle } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useUser } from "@/context/UserContext";

export default function Navbar() {
  const user = useUser();
  return (
    <header className="bg-white border-b border-zoom-border h-14 flex items-center px-6 shrink-0">
      <Link href="/" className="flex items-center gap-2 mr-8">
        <div className="w-8 h-8 bg-zoom-blue rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg leading-none">Z</span>
        </div>
        <span className="font-semibold text-zoom-text text-lg tracking-tight">zoom</span>
      </Link>

      <nav className="hidden md:flex items-center gap-1 flex-1">
        {["Home", "Chat", "Whiteboard", "Clips"].map((item) => (
          <button
            key={item}
            className="px-3 py-1.5 rounded-md text-sm text-zoom-muted hover:text-zoom-text hover:bg-gray-100 transition-colors"
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2 ml-auto">
        <button className="p-2 rounded-full hover:bg-gray-100 text-zoom-muted hover:text-zoom-text transition-colors">
          <HelpCircle size={20} />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100 text-zoom-muted hover:text-zoom-text transition-colors">
          <Settings size={20} />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100 text-zoom-muted hover:text-zoom-text transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-zoom-red rounded-full" />
        </button>
        <button className="ml-1">
          <Avatar name={user.name} size={34} />
        </button>
      </div>
    </header>
  );
}

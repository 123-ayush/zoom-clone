"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, HelpCircle, Settings } from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import { useUser } from "@/context/UserContext";
import { getStoredName } from "@/lib/utils";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Clips", href: "/clips" },
];

export default function Navbar() {
  const user = useUser();
  const pathname = usePathname();
  const displayName = getStoredName() || user.name;

  return (
    <header className="bg-white border-b border-zoom-border h-14 flex items-center px-6 shrink-0">
      <Link href="/" className="flex items-center gap-2 mr-8">
        <div className="w-8 h-8 bg-zoom-blue rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg leading-none">Z</span>
        </div>
        <span className="font-semibold text-zoom-text text-lg tracking-tight">
          zoom
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                active
                  ? "text-zoom-text bg-gray-100"
                  : "text-zoom-muted hover:text-zoom-text hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 ml-auto">
        <button
          className="p-2 rounded-full hover:bg-gray-100 text-zoom-muted hover:text-zoom-text transition-colors"
          aria-label="Help"
        >
          <HelpCircle size={20} />
        </button>
        <button
          className="p-2 rounded-full hover:bg-gray-100 text-zoom-muted hover:text-zoom-text transition-colors"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
        <button
          className="p-2 rounded-full hover:bg-gray-100 text-zoom-muted hover:text-zoom-text transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>
        <button className="ml-1" aria-label={displayName}>
          <Avatar name={displayName} size={34} />
        </button>
      </div>
    </header>
  );
}

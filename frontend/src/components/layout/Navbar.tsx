"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, Pencil, Check, X } from "lucide-react";
import { useState } from "react";

import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/context/ThemeContext";
import { getStoredName, setStoredName } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Clips", href: "/clips" },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [name, setName] = useState(() => getStoredName() || "You");
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState("");

  const openEdit = () => {
    setEditValue(name);
    setEditOpen(true);
  };

  const saveEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setStoredName(trimmed);
    setName(trimmed);
    setEditOpen(false);
  };

  return (
    <>
      <header className="bg-zoom-card border-b border-zoom-border h-14 flex items-center px-4 sm:px-6 shrink-0 sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 mr-8">
          <div className="w-8 h-8 bg-zoom-blue rounded-lg flex items-center justify-center shadow-sm">
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "text-zoom-text bg-zoom-surface"
                    : "text-zoom-muted hover:text-zoom-text hover:bg-zoom-surface"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={name}
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue focus-visible:ring-offset-2 ml-1"
            >
              <UserAvatar name={name} size={34} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-56"
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                <UserAvatar name={name} size={28} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zoom-text truncate">{name}</p>
                  <p className="text-xs text-zoom-muted">Display name</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openEdit} className="gap-2 cursor-pointer">
                <Pencil size={14} />
                Edit name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme} className="gap-2 cursor-pointer">
                {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
                {theme === "light" ? "Dark mode" : "Light mode"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Name edit modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zoom-card rounded-2xl shadow-2xl w-full max-w-xs p-6 border border-zoom-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zoom-text">Edit display name</h3>
              <button
                onClick={() => setEditOpen(false)}
                className="text-zoom-muted hover:text-zoom-text transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <UserAvatar name={editValue || name} size={48} />
            </div>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              placeholder="Your display name"
              maxLength={50}
              autoFocus
              className="w-full border border-zoom-border rounded-xl px-3 py-2.5 text-sm text-zoom-text bg-zoom-card focus:outline-none focus:ring-2 focus:ring-zoom-blue focus:border-transparent mb-3 placeholder:text-zoom-muted"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 border border-zoom-border rounded-xl py-2 text-sm text-zoom-muted hover:text-zoom-text hover:bg-zoom-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!editValue.trim()}
                className="flex-1 bg-zoom-blue text-white rounded-xl py-2 text-sm font-medium hover:bg-zoom-blue-h transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";
import { avatarColor, initials, cn } from "@/lib/utils";

interface Props {
  name: string;
  size?: number;
  className?: string;
}

export default function UserAvatar({ name, size = 32, className }: Props) {
  const bg = avatarColor(name);
  const label = initials(name);
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold shrink-0 select-none",
        className
      )}
      style={{ background: bg, width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      aria-label={name}
    >
      {label}
    </div>
  );
}

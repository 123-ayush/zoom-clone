"use client";
import { avatarColor, initials } from "@/lib/utils";

interface Props {
  name: string;
  size?: number;
  className?: string;
}

export default function Avatar({ name, size = 36, className = "" }: Props) {
  const bg = avatarColor(name);
  const label = initials(name);
  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${className}`}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
      aria-label={name}
    >
      {label}
    </div>
  );
}

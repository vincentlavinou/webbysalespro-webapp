"use client";

import clsx from "clsx";
import { Users } from "lucide-react";
import { useAttendeeCount } from "../hooks/use-attendee-count";


function formatCount(n: number): string {
  if (n >= 1_000_000) {
    const val = n / 1_000_000
    return val < 10 && n % 1_000_000 !== 0 ? `${val.toFixed(1)}M` : `${Math.floor(val)}M`
  }
  if (n >= 10_000) {
    return `${Math.floor(n / 1_000)}k`
  }
  if (n >= 1_000) {
    return `${(Math.floor(n / 100) / 10).toFixed(1)}k`
  }
  return `${n}`
}

type AttendeeCountBadgeProps = {
  className?: string;
};

export function AttendeeCountBadge({ className }: AttendeeCountBadgeProps) {
  const { count, visible } = useAttendeeCount();

  if (!visible) return null;

  return (
    <div
      className={clsx(
        "absolute z-20 flex select-none items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white pointer-events-none",
        className ?? "top-2 left-2",
      )}
    >
      <Users className="size-3.5 shrink-0 text-red-400" />
      <span>{formatCount(count)}</span>
    </div>
  );
}

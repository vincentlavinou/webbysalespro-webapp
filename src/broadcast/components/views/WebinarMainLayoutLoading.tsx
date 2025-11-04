"use client";

import React from "react";
import { cn } from "@/lib/utils"; // optional helper; replace/remove if not used in your project

/**
 * MainShimmer
 * --------------------------------------------
 * Super-lightweight rectangular shimmer for main layout loading states.
 * Default: full width, 320px height, rounded-2xl, subtle moving gradient.
 */

type Props = {
  /** Fixed height in px (ignored if aspect is provided). Default 320 */
  height?: number;
  /** Tailwind aspect class (e.g., 'aspect-video', 'aspect-[4/3]') */
  aspectClassName?: string;
  /** Extra classes to override width/rounding/margins, etc. */
  className?: string;
};

export function WebinarMainLayoutLoading({ height = 320, aspectClassName, className }: Props) {
  return (
    <div
      aria-label="Loading"
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-muted/70",
        aspectClassName ? aspectClassName : undefined,
        className
      )}
      style={aspectClassName ? undefined : { height }}
    >
      {/* base tint */}
      <div className="absolute inset-0 bg-muted" />
      {/* shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* local keyframes so you don't need to touch globals */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

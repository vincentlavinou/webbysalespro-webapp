"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
    <Skeleton
      aria-label="Loading"
      className={cn("w-full rounded-2xl", aspectClassName, className)}
      style={aspectClassName ? undefined : { height }}
    />
  );
}

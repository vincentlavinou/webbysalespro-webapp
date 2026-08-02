import { cn } from "@/lib/utils"

interface LiveIndicatorProps {
  className?: string
  ringClassName?: string
  dotClassName?: string
}

function LiveIndicator({ className, ringClassName, dotClassName }: LiveIndicatorProps) {
  return (
    <span data-slot="live-indicator" className={cn("relative flex h-2 w-2 shrink-0", className)}>
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75",
          ringClassName
        )}
      />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full bg-primary", dotClassName)} />
    </span>
  )
}

export { LiveIndicator }

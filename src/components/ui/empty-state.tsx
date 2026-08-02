import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: ReactNode
  title: ReactNode
  titleClassName?: string
  description?: ReactNode
  descriptionClassName?: string
  className?: string
  children?: ReactNode
}

function EmptyState({
  icon,
  title,
  titleClassName,
  description,
  descriptionClassName,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div data-slot="empty-state" className={cn("flex flex-col items-center justify-center text-center", className)}>
      {icon}
      <h3 className={cn("text-lg font-semibold", titleClassName)}>{title}</h3>
      {description && (
        <p className={cn("mt-2 max-w-sm text-sm text-muted-foreground", descriptionClassName)}>{description}</p>
      )}
      {children}
    </div>
  )
}

export { EmptyState }

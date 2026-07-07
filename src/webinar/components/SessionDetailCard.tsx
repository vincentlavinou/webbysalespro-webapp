import { CalendarDays, Clock } from "lucide-react"
import { ReactNode } from "react"

interface SessionDetailCardProps {
  formattedDate: string
  timezone: string
  clockContent: ReactNode
}

export function SessionDetailCard({ formattedDate, timezone, clockContent }: SessionDetailCardProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Session Details
      </p>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
        <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">{formattedDate}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{timezone}</p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
        <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <div>{clockContent}</div>
      </div>
    </div>
  )
}

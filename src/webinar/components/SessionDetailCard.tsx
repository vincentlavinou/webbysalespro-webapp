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
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
        Session Details
      </p>
      <div className="flex items-start gap-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700 px-4 py-3">
        <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{formattedDate}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{timezone}</p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-4 py-3">
        <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>{clockContent}</div>
      </div>
    </div>
  )
}

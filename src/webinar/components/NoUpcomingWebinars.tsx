import { CalendarX } from 'lucide-react'

interface NoUpcomingWebinarsProps {
  title: string
}
export function NoUpcomingWebinars(props: NoUpcomingWebinarsProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
      <CalendarX className="w-12 h-12 mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold">{props.title}</h3>
      <p className="text-sm max-w-sm mt-2">
        There are currently no public webinars scheduled. Please check back later or follow us to stay updated.
      </p>
    </div>
  )
}

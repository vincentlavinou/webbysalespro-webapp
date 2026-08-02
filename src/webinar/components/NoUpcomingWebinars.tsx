import { CalendarX } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface NoUpcomingWebinarsProps {
  title: string
}
export function NoUpcomingWebinars(props: NoUpcomingWebinarsProps) {
  return (
    <EmptyState
      className="py-16 text-muted-foreground"
      icon={<CalendarX className="w-12 h-12 mb-4 text-gray-400" />}
      title={props.title}
      description="There are currently no public webinars scheduled. Please check back later or follow us to stay updated."
    />
  )
}

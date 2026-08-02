import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DefaultRegistrationLoading() {
  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">

        {/* Right — Form card (first on mobile) */}
        <Card className="order-1 space-y-4 p-6 shadow-xl md:order-2">
          <Skeleton className="h-4 w-3/4" />
          {/* Session picker */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          {/* First & Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          </div>
          {/* Email */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          {/* Phone */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          {/* Button */}
          <Skeleton className="mt-2 h-12 w-full rounded-xl bg-primary/15" />
        </Card>

        {/* Left — Details card (second on mobile) */}
        <Card className="order-2 overflow-hidden py-0 shadow-xl md:order-1">
          {/* Thumbnail */}
          <Skeleton className="h-[220px] w-full rounded-none" />
          <CardContent className="space-y-4 p-6">
            {/* Badge */}
            <Skeleton className="h-5 w-32 rounded-full" />
            {/* Title */}
            <Skeleton className="h-7 w-3/4" />
            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            {/* Presenters */}
            <div className="h-px bg-border" />
            <Skeleton className="h-3 w-1/4" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

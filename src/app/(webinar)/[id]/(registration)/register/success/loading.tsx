import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function RegistrationSuccessLoading() {
  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Left — Details card */}
        <Card className="overflow-hidden py-0 shadow-xl">
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

        {/* Right — Success card */}
        <Card className="space-y-5 p-6 shadow-xl">
          {/* Checkmark circle */}
          <div className="flex flex-col items-center gap-3 text-center">
            <Skeleton className="h-16 w-16 rounded-full border-2 border-primary/20 bg-primary/10" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="h-px bg-border" />
          {/* Section label */}
          <Skeleton className="h-3 w-1/4" />
          {/* Date row */}
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
            <Skeleton className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          {/* Reminder row */}
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
            <Skeleton className="h-4 w-4 shrink-0 bg-primary/20" />
            <Skeleton className="h-4 w-3/4 bg-primary/15" />
          </div>
        </Card>

      </div>
    </div>
  )
}

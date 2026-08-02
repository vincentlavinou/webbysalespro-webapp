import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function CompletedPageLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">

          {/* Left — details skeleton */}
          <Card className="overflow-hidden bg-card/90 py-0 shadow-xl">
            <Skeleton className="h-[220px] w-full rounded-none" />
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-7 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="h-px bg-border" />
              <Skeleton className="h-3 w-1/4" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </CardContent>
          </Card>

          {/* Right — completion skeleton */}
          <Card className="space-y-5 bg-card/90 p-6 shadow-xl">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-full border border-border bg-primary/10" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-2 rounded-xl border border-border bg-muted/50 px-4 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>

        </div>
    </div>
  );
}

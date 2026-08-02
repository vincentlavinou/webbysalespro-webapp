import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

type WaitingRoomShimmerProps = {
  title?: string;
};

export default function WaitingRoomShimmer({ title }: WaitingRoomShimmerProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
        {title && (
          <p className="mb-6 text-center text-sm text-muted-foreground">{title}</p>
        )}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">

          {/* Left — details skeleton */}
          <Card className="overflow-hidden border-border bg-card/90 py-0 shadow-xl">
            <Skeleton className="h-[220px] w-full rounded-none" />
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-32 rounded-full" />
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

          {/* Right — countdown skeleton */}
          <Card className="space-y-5 border-border bg-card/90 p-6 shadow-xl">
            <div className="space-y-2 rounded-xl bg-primary/10 p-5 text-center">
              <Skeleton className="mx-auto h-3 w-24 bg-primary/20" />
              <Skeleton className="mx-auto h-9 w-48 bg-primary/20" />
            </div>
            <div className="h-px bg-border" />
            <Skeleton className="h-3 w-1/4" />
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
              <Skeleton className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
              <Skeleton className="mt-0.5 h-4 w-4 shrink-0 bg-primary/20" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-1/2 bg-primary/15" />
                <Skeleton className="h-3 w-3/4 bg-primary/15" />
              </div>
            </div>
          </Card>

        </div>
    </div>
  );
}

type WaitingRoomShimmerProps = {
  title?: string;
};

export default function WaitingRoomShimmer({ title }: WaitingRoomShimmerProps) {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-8">
        {title && (
          <p className="mb-6 text-center text-sm text-muted-foreground">{title}</p>
        )}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">

          {/* Left — details skeleton */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-xl">
            <div className="h-[220px] w-full bg-muted" />
            <div className="p-6 space-y-4">
              <div className="h-5 w-32 rounded-full bg-muted" />
              <div className="h-7 w-3/4 rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-accent" />
                <div className="h-4 w-5/6 rounded bg-accent" />
              </div>
              <div className="h-px bg-border" />
              <div className="h-3 w-1/4 rounded bg-muted" />
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 flex-shrink-0 rounded-full bg-muted" />
                <div className="h-4 w-1/3 rounded bg-muted" />
              </div>
            </div>
          </div>

          {/* Right — countdown skeleton */}
          <div className="space-y-5 rounded-2xl border border-border bg-card/90 p-6 shadow-xl">
            <div className="space-y-2 rounded-xl bg-primary/10 p-5 text-center">
              <div className="mx-auto h-3 w-24 rounded bg-primary/20" />
              <div className="mx-auto h-9 w-48 rounded bg-primary/20" />
            </div>
            <div className="h-px bg-border" />
            <div className="h-3 w-1/4 rounded bg-muted" />
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
              <div className="mt-0.5 h-4 w-4 flex-shrink-0 rounded bg-muted" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-accent" />
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
              <div className="mt-0.5 h-4 w-4 flex-shrink-0 rounded bg-primary/20" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-1/2 rounded bg-primary/15" />
                <div className="h-3 w-3/4 rounded bg-primary/15" />
              </div>
            </div>
          </div>

        </div>
    </div>
  );
}

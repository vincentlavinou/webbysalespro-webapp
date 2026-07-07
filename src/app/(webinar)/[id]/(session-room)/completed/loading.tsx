export default function CompletedPageLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-8">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">

          {/* Left — details skeleton */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-xl">
            <div className="h-[220px] w-full bg-muted" />
            <div className="p-6 space-y-4">
              <div className="h-5 w-24 rounded-full bg-muted" />
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

          {/* Right — completion skeleton */}
          <div className="space-y-5 rounded-2xl border border-border bg-card/90 p-6 shadow-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full border border-border bg-primary/10" />
              <div className="h-6 w-1/2 rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-accent" />
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-2 rounded-xl border border-border bg-muted/50 px-4 py-4">
              <div className="h-4 w-full rounded bg-accent" />
              <div className="h-4 w-5/6 rounded bg-accent" />
              <div className="h-4 w-2/3 rounded bg-accent" />
            </div>
          </div>

        </div>
    </div>
  );
}

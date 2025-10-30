import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingBrowseEvents() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 space-y-16">
        {/* Header */}
        <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-80" />
        </header>

        {/* Live Webinars Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-12" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <WebinarCardSkeleton key={`live-${i}`} />
            ))}
          </div>
        </section>

        {/* Upcoming Webinars Section */}
        <section className="space-y-6 border-t border-slate-200 pt-10">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-14" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <WebinarCardSkeleton key={`upcoming-${i}`} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function WebinarCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingBrowseEvents() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 space-y-16">
        {/* Header */}
        <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48 bg-slate-200 dark:bg-slate-800" />
            <Skeleton className="h-4 w-64 bg-slate-200 dark:bg-slate-800" />
          </div>
          <Skeleton className="h-10 w-80 bg-slate-200 dark:bg-slate-800" />
        </header>

        {/* Live Webinars Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40 bg-slate-200 dark:bg-slate-800" />
            <Skeleton className="h-5 w-12 bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <WebinarCardSkeleton key={`live-${i}`} />
            ))}
          </div>
        </section>

        {/* Upcoming Webinars Section */}
        <section className="space-y-6 border-t border-slate-200 dark:border-slate-800 pt-10">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48 bg-slate-200 dark:bg-slate-800" />
            <Skeleton className="h-5 w-14 bg-slate-200 dark:bg-slate-800" />
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
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-shadow">
      <Skeleton className="h-40 w-full rounded-none bg-slate-200 dark:bg-slate-800" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800" />
        <Skeleton className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

export default function LoadingMyEvents() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="h-7 w-48 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse mb-2" />
          <div className="h-4 w-64 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>

        {/* Skeleton grid */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-shadow"
            >
              <Skeleton className="h-40 w-full rounded-none bg-slate-200 dark:bg-slate-800" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-center gap-2 pt-2">
                  <CalendarDays className="h-4 w-4 text-slate-300 dark:text-slate-500" />
                  <Skeleton className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

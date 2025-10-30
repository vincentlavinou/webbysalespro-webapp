import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

export default function LoadingMyEvents() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="h-7 w-48 rounded-md bg-slate-200 animate-pulse mb-2" />
          <div className="h-4 w-64 rounded-md bg-slate-100 animate-pulse" />
        </div>

        {/* Skeleton grid */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow"
            >
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center gap-2 pt-2">
                  <CalendarDays className="h-4 w-4 text-slate-300" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

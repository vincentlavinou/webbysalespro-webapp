type WaitingRoomShimmerProps = {
  title?: string;
};

export default function WaitingRoomShimmer({ title }: WaitingRoomShimmerProps) {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-8">
        {title && (
          <p className="mb-6 text-center text-sm text-gray-500 dark:text-slate-400">{title}</p>
        )}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">

          {/* Left — details skeleton */}
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-xl dark:border-slate-700 dark:bg-slate-800/80">
            <div className="h-[220px] w-full bg-gray-200 dark:bg-slate-700" />
            <div className="p-6 space-y-4">
              <div className="h-5 w-32 rounded-full bg-gray-200 dark:bg-slate-700" />
              <div className="h-7 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-100 dark:bg-slate-700/70" />
                <div className="h-4 w-5/6 rounded bg-gray-100 dark:bg-slate-700/70" />
              </div>
              <div className="h-px bg-gray-100 dark:bg-slate-700" />
              <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 flex-shrink-0 rounded-full bg-gray-200 dark:bg-slate-700" />
                <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>

          {/* Right — countdown skeleton */}
          <div className="space-y-5 rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800/80">
            <div className="space-y-2 rounded-xl bg-emerald-100 p-5 text-center dark:bg-emerald-900/30">
              <div className="mx-auto h-3 w-24 rounded bg-emerald-200 dark:bg-emerald-800/70" />
              <div className="mx-auto h-9 w-48 rounded bg-emerald-200 dark:bg-emerald-800/70" />
            </div>
            <div className="h-px bg-gray-100 dark:bg-slate-700" />
            <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
              <div className="mt-0.5 h-4 w-4 flex-shrink-0 rounded bg-gray-200 dark:bg-slate-600" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-slate-600" />
                <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-slate-600/80" />
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/30">
              <div className="mt-0.5 h-4 w-4 flex-shrink-0 rounded bg-emerald-200 dark:bg-emerald-800/70" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-1/2 rounded bg-emerald-100 dark:bg-emerald-800/70" />
                <div className="h-3 w-3/4 rounded bg-emerald-100 dark:bg-emerald-800/70" />
              </div>
            </div>
          </div>

        </div>
    </div>
  );
}

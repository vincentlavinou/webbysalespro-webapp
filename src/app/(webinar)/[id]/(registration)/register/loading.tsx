
export default function DefaultRegistrationLoading() {
  return (
    <div className="animate-pulse px-4 pb-8">
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">

        {/* Right — Form card (first on mobile) */}
        <div className="order-1 space-y-4 rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800/80 md:order-2">
          <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
          {/* Session picker */}
          <div className="space-y-2">
            <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-slate-700/70" />
          </div>
          {/* First & Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-10 rounded-lg bg-gray-100 dark:bg-slate-700/70" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-10 rounded-lg bg-gray-100 dark:bg-slate-700/70" />
            </div>
          </div>
          {/* Email */}
          <div className="space-y-2">
            <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-slate-700/70" />
          </div>
          {/* Phone */}
          <div className="space-y-2">
            <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-slate-700/70" />
          </div>
          {/* Button */}
          <div className="mt-2 h-12 w-full rounded-xl bg-emerald-100 dark:bg-emerald-900/30" />
        </div>

        {/* Left — Details card (second on mobile) */}
        <div className="order-2 overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-xl dark:border-slate-700 dark:bg-slate-800/80 md:order-1">
          {/* Thumbnail */}
          <div className="h-[220px] w-full bg-gray-200 dark:bg-slate-700" />
          <div className="p-6 space-y-4">
            {/* Badge */}
            <div className="h-5 w-32 rounded-full bg-gray-200 dark:bg-slate-700" />
            {/* Title */}
            <div className="h-7 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
            {/* Description */}
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-gray-100 dark:bg-slate-700/70" />
              <div className="h-4 w-5/6 rounded bg-gray-100 dark:bg-slate-700/70" />
              <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-slate-700/70" />
            </div>
            {/* Presenters */}
            <div className="h-px bg-gray-100 dark:bg-slate-700" />
            <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 flex-shrink-0 rounded-full bg-gray-200 dark:bg-slate-700" />
              <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

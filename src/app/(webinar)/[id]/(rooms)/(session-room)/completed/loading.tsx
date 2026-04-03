export default function CompletedPageLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Left — details skeleton */}
          <div className="rounded-2xl overflow-hidden bg-white/80 border border-white/60 shadow-xl">
            <div className="w-full h-[220px] bg-gray-200" />
            <div className="p-6 space-y-4">
              <div className="h-5 w-24 bg-gray-200 rounded-full" />
              <div className="h-7 w-3/4 bg-gray-200 rounded" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-100 rounded" />
                <div className="h-4 w-5/6 bg-gray-100 rounded" />
              </div>
              <div className="h-px bg-gray-100" />
              <div className="h-3 w-1/4 bg-gray-200 rounded" />
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="h-4 w-1/3 bg-gray-200 rounded" />
              </div>
            </div>
          </div>

          {/* Right — completion skeleton */}
          <div className="rounded-2xl bg-white/80 border border-white/60 shadow-xl p-6 space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-gray-200 border-2 border-gray-100" />
              <div className="h-6 w-1/2 bg-gray-200 rounded" />
              <div className="h-4 w-3/4 bg-gray-100 rounded" />
            </div>
            <div className="h-px bg-gray-100" />
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-4 space-y-2">
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-5/6 bg-gray-100 rounded" />
              <div className="h-4 w-2/3 bg-gray-100 rounded" />
            </div>
          </div>

        </div>
    </div>
  );
}

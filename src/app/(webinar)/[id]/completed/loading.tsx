import { Loader2 } from "lucide-react";

export default function CompletedPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-neutral-950">
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-5 py-4 text-gray-800 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-100">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-medium">Loading webinar status...</p>
      </div>
    </div>
  );
}

import { PaginationControls } from "@/components/pagination";
import { SearchWidget } from "@/components/search";
import { Badge } from "@/components/ui/badge";
import { InfoIcon } from "@/components/ui/info-icon";
import { getWebinars } from "@webinar/service";
import { NoUpcomingWebinars, WebinarCard } from "@webinar/components";

const DEFAULT_PAGE_SIZE = 6;

interface WebinarsPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
    page_size?: string;
  }>;
}

export default async function EventsBrowsePage(props: WebinarsPageProps) {
  const searchParams = await props.searchParams;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams.page_size
    ? parseInt(searchParams.page_size, 10)
    : DEFAULT_PAGE_SIZE;

  const [liveWebinars, scheduledWebinars] = await Promise.all([
    getWebinars({
      search: searchParams.search || "",
      page,
      page_size: pageSize,
      status: ["in_progress"],
    }),
    getWebinars({
      search: searchParams.search || "",
      page,
      page_size: pageSize,
    }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 space-y-16">
        {/* Header + Search */}
        <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Browse Webinars
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Discover live and upcoming events happening on WebiSalesPro.
            </p>
          </div>
          <SearchWidget
            className="w-full sm:w-80"
            placeholder="Search webinars by title, speaker, or topic..."
          />
        </header>

        {/* Live Webinars */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Live Webinars</h2>
              <InfoIcon value="Currently happening now" />
            </div>
            <Badge
              variant="outline"
              className="text-xs border-slate-300 dark:border-slate-700"
            >
              {liveWebinars.count} Live
            </Badge>
          </div>

          {liveWebinars.results.length > 0 ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {liveWebinars.results.map((webinar, index) => (
                  <WebinarCard
                    key={`${webinar.id}-${index}`}
                    webinar={webinar}
                    type="live"
                  />
                ))}
              </div>
              {liveWebinars.count > pageSize && (
                <div className="pt-6">
                  <PaginationControls
                    totalPages={Math.ceil(liveWebinars.count / pageSize)}
                    defaultPageSize={DEFAULT_PAGE_SIZE}
                  />
                </div>
              )}
            </>
          ) : (
            <NoUpcomingWebinars title="No live webinars right now" />
          )}
        </section>

        {/* Upcoming Webinars */}
        <section className="space-y-6 border-t border-slate-200 dark:border-slate-800 pt-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Upcoming Webinars</h2>
              <InfoIcon value="Webinars scheduled for later" />
            </div>
            <Badge
              variant="outline"
              className="text-xs border-slate-300 dark:border-slate-700"
            >
              {scheduledWebinars.count} Upcoming
            </Badge>
          </div>

          {scheduledWebinars.results.length > 0 ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {scheduledWebinars.results.map((webinar, index) => (
                  <WebinarCard
                    key={`${webinar.id}-${index}`}
                    webinar={webinar}
                    type="upcoming"
                  />
                ))}
              </div>
              {scheduledWebinars.count > pageSize && (
                <div className="pt-6">
                  <PaginationControls
                    totalPages={Math.ceil(
                      scheduledWebinars.count / pageSize
                    )}
                    defaultPageSize={DEFAULT_PAGE_SIZE}
                  />
                </div>
              )}
            </>
          ) : (
            <NoUpcomingWebinars title="No upcoming webinars scheduled" />
          )}
        </section>
      </div>
    </div>
  );
}

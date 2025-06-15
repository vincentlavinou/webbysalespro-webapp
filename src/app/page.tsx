import { PaginationControls } from "@/components/pagination";
import { SearchWidget } from "@/components/search";
import { Badge } from "@/components/ui/badge";
import { InfoIcon } from "@/components/ui/info-icon";
import { Metadata } from "next";
import { getWebinars } from "@webinar/service";
import { NoUpcomingWebinars, WebinarCard } from "@webinar/components";

const DEFAULT_PAGE_SIZE = 6

interface WebinarsPageProps {
    searchParams: Promise<{
        search?: string;
        page?: string;
        page_size?: string;
    }>
}

export const metadata: Metadata = {
    title: "Webinars",
    description: "View live, upcomming, and post webinars in one place."
}

export default async function HomePage(props: WebinarsPageProps) {

  const searchParams = await props.searchParams
    const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
    const pageSize = searchParams.page_size ? parseInt(searchParams.page_size, 10) : DEFAULT_PAGE_SIZE ;
    const scheduledWebinars = await getWebinars({ 
        search: searchParams.search || "",
        page: page,
        page_size: pageSize
    });
    const liveWebinars = await getWebinars({
        search: searchParams.search || "",
        page: page,
        page_size: pageSize,
        status: ['in_progress']
    })

  return (
    <div className="w-full p-6 space-y-6">
       <div className="w-full flex justify-start mb-6">
            <SearchWidget 
                className="w-full max-w-md p-2 relative"
                placeholder="Search webinars by title, speaker, or topic..." />
       </div>
       <section className="w-full">
        <div className="w-full flex flex-row items-center justify-between mb-6">
            <div className="flex flex-row items-center gap-2">
                <h2 className="text-xl font-semibold">Live Webinars</h2>
                <InfoIcon value="Webinar that is up coming"/>
            </div>
            <div>
                <Badge variant="outline" className="text-xs">
                    {liveWebinars.count} Live
                </Badge>
            </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveWebinars.results.length > 0 ?liveWebinars.results.map((webinar, index) => <WebinarCard 
            key={`${webinar.id}-${index}`} 
            webinar={webinar} 
            type="live"
            />) : <NoUpcomingWebinars title="No live webinars"/>}
        </div>
        <PaginationControls totalPages={Math.ceil(liveWebinars.count / pageSize)} defaultPageSize={DEFAULT_PAGE_SIZE} />
      </section>
      <section className="w-full">
        <div className="w-full flex flex-row items-center justify-between mb-6">
            <div className="flex flex-row items-center gap-2">
                <h2 className="text-xl font-semibold">Upcoming Webinars</h2>
                <InfoIcon value="Webinar that is up coming"/>
            </div>
            <div>
                <Badge variant="outline" className="text-xs">
                    {scheduledWebinars.count} Upcoming
                </Badge>
            </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scheduledWebinars.results.length > 0 ?scheduledWebinars.results.map((webinar, index) => <WebinarCard 
            key={`${webinar.id}-${index}`} 
            webinar={webinar} 
            type="upcoming"
            />) : <NoUpcomingWebinars title="No upcoming webinars" />}
        </div>
        <PaginationControls totalPages={Math.ceil(scheduledWebinars.count / pageSize)} defaultPageSize={DEFAULT_PAGE_SIZE} />
      </section>

      {/* <section>
      <div className="w-full flex flex-row items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Past Webinars</h2>
            <div>
                <Badge variant="outline" className="text-xs">
                    {past.length} Past
                </Badge>
                <Link href="/webinars/archives/" className="ml-4">
                    <Button variant="outline" size="sm">
                        More ...
                    </Button>
                </Link>
            </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {past.map(webinar => <WebinarCard key={webinar.id} webinar={webinar} type="past" />)}
        </div>
      </section> */}
    </div>
  )
}
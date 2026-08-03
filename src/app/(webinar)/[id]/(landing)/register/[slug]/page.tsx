import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicWebinarState } from "@/webinar/service";
import { getPublicLandingPage } from "@/webinar/landing-page/service";
import { LandingPageRenderer } from "@/webinar/landing-page/LandingPageRenderer";
import { PausedWebinarNotice, WebinarFooter } from "@/webinar/components";
import { getVisitorIdFromCookie } from "@/lib/visitor-id-server";

type Props = { params: Promise<{ id: string; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function loadState(params: Props["params"], searchParams: Props["searchParams"]) {
  const { id, slug } = await params;
  const query = await searchParams;
  const visitorId = await getVisitorIdFromCookie();
  const requestQuery = { ...query, visitor_id: visitorId };
  const [state, page] = await Promise.all([getPublicWebinarState(id, { fresh: true }, requestQuery), getPublicLandingPage(id, slug, requestQuery)]);
  if (state.kind === "not_found") notFound();
  if (!page) redirect(`/${id}/register`);
  return { state, page };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { state, page } = await loadState(params, searchParams);
  if (state.kind === "paused") {
    return { title: page.name || "Webinar Registration Paused", description: state.pauseInfo.message || undefined };
  }
  return { title: page.name || state.webinar.title, description: state.webinar.description || undefined };
}

export default async function LandingPage({ params, searchParams }: Props) {
  const { state, page } = await loadState(params, searchParams);

  if (state.kind === "paused") {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <main className="flex-1">
          <div className="mx-auto w-full max-w-3xl px-4 py-20">
            <PausedWebinarNotice pauseInfo={state.pauseInfo} />
          </div>
        </main>
        <WebinarFooter />
      </div>
    );
  }

  const webinar = state.webinar;
  return (
    <>
      {page.header_scripts ? <head dangerouslySetInnerHTML={{ __html: page.header_scripts }} /> : null}
      <LandingPageRenderer webinar={webinar} webinarPromise={Promise.resolve(webinar)} page={page} />
    </>
  );
}

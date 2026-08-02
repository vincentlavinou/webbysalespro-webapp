import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicWebinarState } from "@/webinar/service";
import { getPublicLandingPage } from "@/webinar/landing-page/service";
import { LandingPageRenderer } from "@/webinar/landing-page/LandingPageRenderer";
import { PausedWebinarNotice } from "@/webinar/components";

type Props = { params: Promise<{ id: string; slug: string }> };

async function loadState(params: Props["params"]) {
  const { id, slug } = await params;
  const [state, page] = await Promise.all([getPublicWebinarState(id, { fresh: true }), getPublicLandingPage(id, slug)]);
  if (state.kind === "not_found" || !page) notFound();
  return { state, page };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, page } = await loadState(params);
  if (state.kind === "paused") {
    return { title: page.name || "Webinar Registration Paused", description: state.pauseInfo.message || undefined };
  }
  return { title: page.name || state.webinar.title, description: state.webinar.description || undefined };
}

export default async function LandingPage({ params }: Props) {
  const { state, page } = await loadState(params);

  if (state.kind === "paused") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20">
        <PausedWebinarNotice pauseInfo={state.pauseInfo} />
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

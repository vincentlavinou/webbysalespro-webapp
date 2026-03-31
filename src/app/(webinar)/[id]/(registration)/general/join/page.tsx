import { Metadata } from "next";
import { notFound } from "next/navigation";

import { WebinarDetailCard } from "@/webinar/components/WebinarDetailCard";
import { getWebinar } from "@/webinar/service";
import { isWebinarPayload } from "@/webinar/service/guards";

import { AnonymousJoinClient } from "./client";

interface GeneralJoinPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: GeneralJoinPageProps): Promise<Metadata> {
  const webinarId = (await params).id;
  const webinar = await getWebinar(webinarId, { fresh: true });

  if (!isWebinarPayload(webinar)) {
    return {
      title: "Join Webinar",
      description: "Join this webinar.",
    };
  }

  return {
    title: `Join ${webinar.title}`,
    description: webinar.description ?? "Join this webinar.",
    openGraph: {
      title: webinar.title,
      description: webinar.description,
      images: webinar.media
        ?.filter((media) => media.file_type === "image" && media.field_type === "thumbnail")
        .map((media) => ({ url: media.file_url })) ?? [],
    },
    twitter: {
      card: "summary_large_image",
      title: webinar.title,
      description: webinar.description,
    },
  };
}

export default async function GeneralJoinPage(props: GeneralJoinPageProps) {
  const webinarId = (await props.params).id;
  const webinar = await getWebinar(webinarId, { fresh: true });

  if (!isWebinarPayload(webinar)) {
    notFound();
  }

  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        <WebinarDetailCard
          webinar={webinar}
          badge={
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              General Access
            </span>
          }
        />

        <div className="order-1 rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/80 md:order-2">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-slate-300">
            Joining {webinar.title}
          </p>
          <AnonymousJoinClient webinarId={webinar.id} />
        </div>
      </div>
    </div>
  );
}

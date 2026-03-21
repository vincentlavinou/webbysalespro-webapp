import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { getWebinar } from "@/webinar/service";
import { isWebinarPayload } from "@/webinar/service/guards";

interface CompletedPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompletedPage(props: CompletedPageProps) {
  const webinarId = (await props.params).id;
  const webinar = await getWebinar(webinarId, { fresh: true });
  const hasWebinar = isWebinarPayload(webinar);

  const thumbnail = hasWebinar
    ? webinar.media?.find((m) => m.file_type === "image" && m.field_type === "thumbnail")
    : null;

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Left — Webinar details */}
          <div className="rounded-2xl overflow-hidden bg-white/80 backdrop-blur-md shadow-xl border border-white/60">
            {thumbnail?.file_url && (
              <div className="relative w-full h-[220px]">
                <Image src={thumbnail.file_url} alt="Webinar thumbnail" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            )}
            <div className="p-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 mb-4">
                Session Ended
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-3">
                {hasWebinar ? webinar.title : "Webinar Session"}
              </h1>
              {hasWebinar && webinar.description && (
                <p className="text-gray-500 text-sm leading-relaxed">
                  {webinar.description}
                </p>
              )}

              {hasWebinar && webinar.presenters?.length > 0 && (
                <>
                  <hr className="border-gray-100 my-5" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Your {webinar.presenters.length === 1 ? "Presenter" : "Presenters"}
                  </p>
                  <div className="flex flex-col gap-3">
                    {webinar.presenters.map((presenter) => {
                      const avatar = presenter.media?.find(
                        (m) => m.file_type === "image" && (m.field_type === "thumbnail" || m.field_type === "profile")
                      );
                      return (
                        <div key={presenter.id} className="flex items-center gap-3">
                          <div className="relative h-11 w-11 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 ring-2 ring-white shadow">
                            {avatar?.file_url ? (
                              <Image src={avatar.file_url} alt={presenter.name} fill className="object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-gray-500 font-bold text-sm">
                                {presenter.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{presenter.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right — Completion message */}
          <div className="rounded-2xl bg-white/80 backdrop-blur-md shadow-xl border border-white/60 p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 border-2 border-gray-200 mb-4">
                <CheckCircle2 className="h-8 w-8 text-gray-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Session Complete</h2>
              <p className="text-gray-500 text-sm mt-1">
                Thank you for attending. This session has now ended.
              </p>
            </div>

            <hr className="border-gray-100 mb-5" />

            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-4 text-center">
              <p className="text-sm text-gray-600 leading-relaxed">
                We hope you found this session valuable. Keep an eye on your inbox for a recording or follow-up from the presenter.
              </p>
            </div>
          </div>

        </div>
    </div>
  );
}

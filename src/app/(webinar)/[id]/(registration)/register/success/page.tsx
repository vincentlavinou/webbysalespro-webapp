import { DateTime } from "luxon";
import { CheckCircle, CalendarDays, Clock } from "lucide-react";
import { getWebinar } from "@/webinar/service";
import { isWebinarPayload } from "@/webinar/service/guards";
import { notFound } from "next/navigation";
import Image from "next/image";
import CalendarButton from "@/webinar/components/CalendarButton";
import BookmarkButton from "@/webinar/components/BookmarkButton";
import ShareButton from "@/webinar/components/ShareButton";

interface RegistrationSuccessProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id: string; token?: string }>;
}

export default async function RegistrationSuccessPage(props: RegistrationSuccessProps) {
  const webinarId = (await props.params).id;
  const { session_id: sessionId, token } = await props.searchParams;

  const webinar = await getWebinar(webinarId, { fresh: true });
  if (!isWebinarPayload(webinar) || !sessionId) {
    notFound();
  }

  const sessions = webinar.series?.sessions ?? [];
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) {
    notFound();
  }

  const sessionDt = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || "utc" });
  const formattedDate = sessionDt.toFormat("cccc, LLLL d yyyy, h:mm a");
  const timezone = sessionDt.offsetNameLong;

  const thumbnail = webinar.media.find(
    (m) => m.file_type === "image" && m.field_type === "thumbnail"
  );

  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Left — Webinar details */}
        <div className="order-last md:order-first rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-white/60 dark:border-slate-700">
          {thumbnail?.file_url && (
            <div className="relative w-full h-[220px]">
              <Image src={thumbnail.file_url} alt="Webinar thumbnail" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}
          <div className="p-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-3 py-1 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              Free Online Webinar
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
              {webinar.title}
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">
              {webinar.description}
            </p>

            {/* Presenters */}
            {webinar.presenters?.length > 0 && (
              <>
                <hr className="border-gray-100 dark:border-slate-700 my-5" />
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
                  Your {webinar.presenters.length === 1 ? "Presenter" : "Presenters"}
                </p>
                <div className="flex flex-col gap-3">
                  {webinar.presenters.map((presenter) => {
                    const avatar = presenter.media?.find(
                      (m) => m.file_type === "image" && (m.field_type === "thumbnail" || m.field_type === "icon")
                    );
                    return (
                      <div key={presenter.id} className="flex items-center gap-3">
                        <div className="relative h-11 w-11 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/40 flex-shrink-0 ring-2 ring-white dark:ring-slate-600 shadow">
                          {avatar?.file_url ? (
                            <Image src={avatar.file_url} alt={presenter.name} fill className="object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-emerald-700 font-bold text-sm">
                              {presenter.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{presenter.name}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right — Success confirmation */}
        <div className="order-first md:order-last rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-white/60 dark:border-slate-700 p-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-700 mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">You&apos;re Registered!</h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
              Check your email for your confirmation and join link.
            </p>
          </div>

          <hr className="border-gray-100 dark:border-slate-700 mb-5" />

          {/* Session details */}
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
            Session Details
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700 px-4 py-3">
              <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formattedDate}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{timezone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-4 py-3">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                A reminder will be sent before the session starts.
              </p>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-slate-700 mt-2" />

          <div className="flex flex-col gap-2 pt-1">
            {token && (
              <CalendarButton
                title={webinar.title}
                description={webinar.description ?? ''}
                startIso={session.scheduled_start}
                timezone={session.timezone || 'utc'}
                uid={sessionId}
                url={`/${sessionId}/live?token=${token}`}
              />
            )}
            {token && (
              <BookmarkButton livePath={`/${sessionId}/live?token=${token}`} />
            )}
            <ShareButton
              registrationPath={`/${webinarId}/register`}
              title={webinar.title}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

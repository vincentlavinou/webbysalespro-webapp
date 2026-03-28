import { DateTime } from "luxon";
import { CheckCircle } from "lucide-react";
import { getWebinar } from "@/webinar/service";
import { isWebinarPayload } from "@/webinar/service/guards";
import { notFound } from "next/navigation";
import CalendarButton from "@/webinar/components/CalendarButton";
import BookmarkButton from "@/webinar/components/BookmarkButton";
import ShareButton from "@/webinar/components/ShareButton";
import { SessionDetailCard } from "@/webinar/components/SessionDetailCard";
import { WebinarDetailCard } from "@/webinar/components/WebinarDetailCard";
import { JoinResolveResponse } from "@/attendee-session/service/type";

const webinarApiUrl = process.env.WEBINAR_BASE_API_URL
  ?? process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL
  ?? "https://api.webisalespro.com/api";

interface RegistrationSuccessProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string; t?: string; webinar_id?: string }>;
}

async function resolveEffectiveSession(rawJoinToken: string) {
  const response = await fetch(
    `${webinarApiUrl}/v2/join/resolve?t=${encodeURIComponent(rawJoinToken)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as JoinResolveResponse;
  return data.effective_session;
}

export default async function RegistrationSuccessPage(props: RegistrationSuccessProps) {
  const webinarId = (await props.params).id;
  const { session_id: sessionId, t: rawJoinToken, webinar_id } = await props.searchParams;

  const webinar = await getWebinar(webinarId, { fresh: true });
  if (!isWebinarPayload(webinar)) {
    notFound();
  }

  const sessions = webinar.series?.sessions ?? [];
  const sessionFromWebinar = sessionId
    ? sessions.find((s) => s.id === sessionId)
    : undefined;
  const session = sessionFromWebinar ?? (rawJoinToken ? await resolveEffectiveSession(rawJoinToken) : null);

  if (!session) {
    notFound();
  }

  const sessionDt = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || "utc" });
  const formattedDate = sessionDt.toFormat("cccc, LLLL d yyyy, h:mm a");
  const timezone = sessionDt.offsetNameLong ?? session.timezone ?? sessionDt.zoneName;

  // Build the join path server-side — never constructed client-side
  const effectiveWebinarId = webinar_id ?? webinarId;
  const joinPath = rawJoinToken
    ? `/join/live?t=${encodeURIComponent(rawJoinToken)}&webinar_id=${effectiveWebinarId}`
    : undefined;

  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Left — Webinar details */}
        <WebinarDetailCard
          webinar={webinar}
          badge={
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-3 py-1 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              Free Online Webinar
            </span>
          }
        />

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

          <SessionDetailCard
            formattedDate={formattedDate}
            timezone={timezone}
            clockContent={
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                A reminder will be sent before the session starts.
              </p>
            }
          />

          <hr className="border-gray-100 dark:border-slate-700 mt-2" />

          <div className="flex flex-col gap-2 pt-1">
            {joinPath && (
              <CalendarButton
                title={webinar.title}
                description={webinar.description ?? ''}
                startIso={session.scheduled_start}
                timezone={session.timezone || 'utc'}
                uid={session.id}
                url={joinPath}
              />
            )}
            {joinPath && (
              <BookmarkButton livePath={joinPath} />
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

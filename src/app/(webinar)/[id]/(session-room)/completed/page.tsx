import { CheckCircle2 } from "lucide-react";
import { getWebinarFromSession } from "@/webinar/service/action";
import { isWebinarPayload } from "@/webinar/service/guards";
import { WebinarDetailCard } from "@/webinar/components/WebinarDetailCard";
import { getAttendeeSessionCookie } from "@/lib/attendee-cookie";
import WaitingRoomShimmer from "@/webinar/components/WaitingRoomShimmer";

interface CompletedPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompletedPage(props: CompletedPageProps) {
  const attendeeSession = await getAttendeeSessionCookie();
  if (!attendeeSession) {
    return <WaitingRoomShimmer title="Resolving your access..." />;
  }

  const sessionId = (await props.params).id;
  let webinar = null;

  try {
    const webinarResult = await getWebinarFromSession({ id: attendeeSession.sessionId || sessionId });
    webinar = webinarResult && isWebinarPayload(webinarResult.data) ? webinarResult.data : null;
  } catch {
    webinar = null;
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Left — Webinar details */}
          <WebinarDetailCard
            webinar={webinar}
            fallbackTitle="Webinar Session"
            badge={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full px-3 py-1 mb-4">
                Session Ended
              </span>
            }
          />

          {/* Right — Completion message */}
          <div className="order-first md:order-last rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-white/60 dark:border-slate-700 p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 mb-4">
                <CheckCircle2 className="h-8 w-8 text-gray-500 dark:text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Session Complete</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                Thank you for attending. This session has now ended.
              </p>
            </div>

            <hr className="border-gray-100 dark:border-slate-700 mb-5" />

            <div className="rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700 px-4 py-4 text-center">
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                We hope you found this session valuable. Keep an eye on your inbox for a recording or follow-up from the presenter.
              </p>
            </div>
          </div>

        </div>
    </div>
  );
}

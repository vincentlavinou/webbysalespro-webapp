import Link from "next/link";
import { DateTime } from "luxon";
import { CheckCircle } from "lucide-react";
import { getWebinar, WebinarPresenter } from "@/webinar/service";
import { isWebinarPayload } from "@/webinar/service/guards";
import { notFound } from "next/navigation";

interface RegistrationSuccessProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id: string }>;
}

export default async function RegistrationSuccessPage(props: RegistrationSuccessProps) {
  const webinarId = (await props.params).id;
  const sessionId = (await props.searchParams).session_id;

  const webinar = await getWebinar(webinarId, { fresh: true });
  if (!isWebinarPayload(webinar) || !sessionId) {
    notFound();
  }

  const sessions = webinar.series?.sessions ?? [];
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) {
    notFound();
  }

  const formattedDate = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || "utc" })
    .toFormat("cccc, LLL d @ t ZZZZ");

  return (
    <div className="min-h-screen max-w-2xl mx-auto mt-16 px-6 text-center
                    bg-white text-gray-800
                    dark:bg-neutral-950 dark:text-gray-100">
      <div className="flex flex-col items-center justify-center space-y-6">
        <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" aria-hidden="true" />
        <h1 className="text-3xl font-semibold">You&apos;re Registered!</h1>

        <p className="text-md text-gray-600 dark:text-gray-300">
          You&apos;ve successfully registered for{" "}
          <span className="font-medium">{webinar.title}</span>.
        </p>

        <div className="w-full text-left rounded-md p-4
                        bg-gray-100 text-gray-700
                        dark:bg-neutral-900 dark:text-gray-200
                        border border-gray-200 dark:border-neutral-800">
          <p className="text-sm">
            <span className="font-semibold">Session Time:</span> {formattedDate}
          </p>

          {webinar.presenters?.length ? (
            <p className="text-sm mt-1">
              <span className="font-semibold">Hosted by:</span>{" "}
              {webinar.presenters.map((p: WebinarPresenter, i: number) => (
                <span key={p.id}>
                  {p.name}
                  {i < webinar.presenters.length - 1 && ", "}
                </span>
              ))}
            </p>
          ) : null}
        </div>

        <div className="mt-6">
          <Link href="/" className="inline-block">
            <button
              className="px-4 py-2 rounded-md transition
                         bg-emerald-600 hover:bg-emerald-700 text-white
                         dark:bg-emerald-500 dark:hover:bg-emerald-600
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                         focus-visible:ring-emerald-500 ring-offset-white
                         dark:ring-offset-neutral-950"
            >
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

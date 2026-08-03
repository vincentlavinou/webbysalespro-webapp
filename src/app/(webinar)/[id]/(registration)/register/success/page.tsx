import { DateTime } from "luxon";
import { getWebinar } from "@/webinar/service";
import { isWebinarPayload } from "@/webinar/service/guards";
import { notFound } from "next/navigation";
import { resolveJoin } from "@/attendee-session/service/resolve-join";
import { sanitizeJoinToken, sanitizeWebinarId } from "@/webinar/service/join-params";
import { WebinarRegistrationSuccessView } from "@/webinar/components/WebinarRegistrationSuccessView";

interface RegistrationSuccessProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string; t?: string; webinar_id?: string }>;
}

async function resolveEffectiveSession(rawJoinToken: string) {
  const data = await resolveJoin(rawJoinToken);
  return data?.effective_session ?? null;
}

export default async function RegistrationSuccessPage(props: RegistrationSuccessProps) {
  const webinarId = (await props.params).id;
  const { session_id: sessionId, t: rawJoinToken, webinar_id: rawWebinarId } = await props.searchParams;
  const joinToken = sanitizeJoinToken(rawJoinToken);
  const webinarIdFromSearch = sanitizeWebinarId(rawWebinarId);

  const webinar = await getWebinar(webinarId, { fresh: true });
  if (!isWebinarPayload(webinar)) {
    notFound();
  }

  const sessions = webinar.series?.sessions ?? [];
  const sessionFromWebinar = sessionId
    ? sessions.find((s) => s.id === sessionId)
    : undefined;
  const session = sessionFromWebinar ?? (joinToken ? await resolveEffectiveSession(joinToken) : null);

  if (!session) {
    notFound();
  }

  const sessionDt = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || "utc" });
  const formattedDate = sessionDt.toFormat("cccc, LLLL d yyyy, h:mm a");
  const timezone = sessionDt.offsetNameLong ?? session.timezone ?? sessionDt.zoneName;

  // Build the join path server-side — never constructed client-side
  const effectiveWebinarId = webinarIdFromSearch ?? webinarId;
  const joinPath = joinToken
    ? `/join/live?t=${encodeURIComponent(joinToken)}&webinar_id=${encodeURIComponent(effectiveWebinarId)}`
    : undefined;

  const theme = webinar.registration_settings?.theme;

  return (
    <WebinarRegistrationSuccessView
      webinar={webinar}
      formattedDate={formattedDate}
      timezone={timezone}
      session={session}
      joinPath={joinPath}
      registrationPath={`/${webinarId}/register`}
      theme={{
        primaryColor: theme?.primary_color ?? undefined,
        backgroundColor: theme?.background_color ?? undefined,
        secondaryColor: theme?.secondary_color ?? undefined,
        secondaryBackgroundColor: theme?.secondary_background_color ?? undefined,
        buttonTextColor: theme?.button_text_color ?? undefined,
      }}
    />
  );
}

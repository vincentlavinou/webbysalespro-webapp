import { DateTime } from "luxon";
import { notFound, redirect } from "next/navigation";
import { getWebinar } from "@/webinar/service";
import { isWebinarPayload } from "@/webinar/service/guards";
import { resolveJoin } from "@/attendee-session/service/resolve-join";
import { sanitizeJoinToken, sanitizeWebinarId } from "@/webinar/service/join-params";
import { getPublicLandingPage } from "@/webinar/landing-page/service";
import { WebinarFooter, WebinarRegistrationSuccessView } from "@/webinar/components";
import { DEFAULT_REGISTRATION_THEME } from "@/webinar/theme/default-theme";
import { REGISTRATION_FONT_STACKS } from "@/webinar/theme/fonts";

interface LandingRegistrationSuccessProps {
  params: Promise<{ id: string; slug: string }>;
  searchParams: Promise<{ session_id?: string; t?: string; webinar_id?: string }>;
}

async function resolveEffectiveSession(rawJoinToken: string) {
  const data = await resolveJoin(rawJoinToken);
  return data?.effective_session ?? null;
}

export default async function LandingRegistrationSuccessPage(props: LandingRegistrationSuccessProps) {
  const { id: webinarId, slug } = await props.params;
  const { session_id: sessionId, t: rawJoinToken, webinar_id: rawWebinarId } = await props.searchParams;
  const joinToken = sanitizeJoinToken(rawJoinToken);
  const webinarIdFromSearch = sanitizeWebinarId(rawWebinarId);

  const [webinar, page] = await Promise.all([
    getWebinar(webinarId, { fresh: true }),
    getPublicLandingPage(webinarId, slug),
  ]);

  if (!isWebinarPayload(webinar)) {
    notFound();
  }

  // No published landing page at this slug — fall back to the base success page,
  // preserving the join/session params the redirect arrived with.
  if (!page) {
    const fallbackParams = new URLSearchParams();
    if (sessionId) fallbackParams.set("session_id", sessionId);
    if (rawJoinToken) fallbackParams.set("t", rawJoinToken);
    if (rawWebinarId) fallbackParams.set("webinar_id", rawWebinarId);
    const query = fallbackParams.toString();
    redirect(`/${webinarId}/register/success${query ? `?${query}` : ""}`);
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

  // page.theme is already resolved server-side as landing page theme -> registration
  // setting theme; a blank field here means neither tier set a value, so the
  // client-side default theme is the final fallback tier.
  const backgroundColor = page.theme.background_color || webinar.registration_settings?.theme?.background_color || DEFAULT_REGISTRATION_THEME.background_color;

  return (
    <div className="flex min-h-screen flex-col text-foreground" style={{ backgroundColor }}>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl pt-20 pb-4">
      <WebinarRegistrationSuccessView
        webinar={webinar}
        formattedDate={formattedDate}
        timezone={timezone}
        session={session}
        joinPath={joinPath}
        registrationPath={`/${webinarId}/register/${slug}`}
        theme={{
          primaryColor: page.theme.primary_color || webinar.registration_settings?.theme?.primary_color || DEFAULT_REGISTRATION_THEME.primary_color,
          backgroundColor,
          secondaryColor: page.theme.secondary_color || webinar.registration_settings?.theme?.secondary_color || DEFAULT_REGISTRATION_THEME.secondary_color,
          secondaryBackgroundColor:
            page.theme.secondary_background_color || webinar.registration_settings?.theme?.secondary_background_color || DEFAULT_REGISTRATION_THEME.secondary_background_color,
          buttonTextColor: page.theme.button_text_color || webinar.registration_settings?.theme?.button_text_color || DEFAULT_REGISTRATION_THEME.button_text_color,
          fontFamily: REGISTRATION_FONT_STACKS[page.theme.font_family] || REGISTRATION_FONT_STACKS.system,
        }}
      />
        </div>
      </main>
      <WebinarFooter />
    </div>
  );
}

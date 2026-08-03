import { DateTime } from "luxon";
import type { SeriesSession, Webinar } from "@/webinar/service";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import type { AttendeeFormData } from "./schema";
type RegistrationInput = Pick<AttendeeFormData, "first_name" | "last_name" | "email"> & { phone?: string | null; session_id?: string };

export function findRegisteredSession(webinar: Webinar, input: Pick<RegistrationInput, "session_id">) {
  const sessions = webinar.series?.sessions ?? [];
  const nextSession = sessions.find((session) => session.status === WebinarSessionStatus.IN_PROGRESS) ?? sessions[0];
  return { session: sessions.find((item) => item.id === input.session_id) ?? nextSession, sessionId: input.session_id ?? nextSession?.id };
}

export function buildLeadQuery(input: RegistrationInput, session?: SeriesSession) {
  const query = new URLSearchParams({ wsp_lead_first_name: input.first_name, wsp_lead_last_name: input.last_name });
  if (input.phone) query.set("wsp_lead_phone", input.phone);
  if (!session) return query;

  const date = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || "utc" });
  query.set("wsp_event_ts", String(Math.floor(date.toMillis() / 1000)));
  query.set("wsp_event_tz", session.timezone || "utc");
  query.set("wsp_next_event_date", date.toFormat("cccc, d LLLL yyyy"));
  query.set("wsp_next_event_time", date.toFormat("h:mm a"));
  query.set("wsp_next_event_timezone", `(GMT${date.toFormat("ZZ")}) ${date.toFormat("ZZZZZ")}`);
  return query;
}

export function appendRegistrationQuery(url: string, input: RegistrationInput, session?: SeriesSession) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}email=${encodeURIComponent(input.email)}&${buildLeadQuery(input, session).toString()}`;
}

export function getRegistrationSuccessUrl(webinar: Webinar, embedSource?: string, embedSuccessUrl?: string, landingPageSource?: string, landingSuccessUrl?: string | null) {
  if (embedSource) return embedSuccessUrl;
  if (landingPageSource) return landingSuccessUrl;
  return webinar.registration_settings?.registration_success_url;
}

import { WebinarSessionStatus } from "./enum";
import type { SeriesSession, Webinar } from "./type";

export function isWebinarPayload(value: unknown): value is Webinar {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Webinar>;
  return typeof candidate.id === "string" && typeof candidate.title === "string";
}

export function isSessionPayload(value: unknown): value is SeriesSession {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<SeriesSession>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.scheduled_start === "string" &&
    typeof candidate.timezone === "string" &&
    Object.values(WebinarSessionStatus).includes(candidate.status as WebinarSessionStatus)
  );
}

// These three now come from the shared package, corrected and tested there.
//
// They keep their local names and call shapes so the ~14 files importing them
// do not change, with one exception noted below.
//
// What changed behind the names:
//
// - `isWebinarPayload` checks the container fields too, not just `id` and
//   `title`. The old version accepted a paused-webinar notice that happened to
//   carry a title, and the render then failed on a missing `settings`.
//
// - `isSessionPayload` no longer casts. Its status check used to read
//   `candidate.status as WebinarSessionStatus`, a cast in the one function
//   whose whole job was to not trust the value — so a status from the
//   attendance vocabulary (`waiting`, `live`) passed it. The vocabularies are
//   const objects now, so checking membership and narrowing the type are the
//   same operation.
//
// - `allowsManualSessionSelection` takes the series rather than the webinar,
//   and reads it as the discriminated union it is. Only a recurring series can
//   withhold the choice; single and multi do not carry `registration_behavior`
//   at all, so the old optional-chain read gave the right answer by accident.

import {
  allowsManualSessionSelection as allowsManualSessionSelectionForSeries,
  isPublicWebinarDto,
  isSeriesSessionDto,
} from "@lavinou/webbysalespro/webinar";
import type { Webinar } from "./type";

export const isWebinarPayload = isPublicWebinarDto;

export const isSessionPayload = isSeriesSessionDto;

/**
 * Kept taking the webinar so the existing call sites read unchanged; the
 * package's version takes the series directly.
 */
export function allowsManualSessionSelection(
  webinar: Pick<Webinar, "series">,
): boolean {
  return allowsManualSessionSelectionForSeries(webinar.series);
}

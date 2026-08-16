import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import {
  isPublishingRole,
  isRenderable,
  participantKind,
  participantRole,
} from "../participants/participant-state";

/**
 * The single-publisher rule, for sessions where layout setup is unavailable.
 *
 * There is no arrangement to resolve here and there must never be one. The
 * backend refuses source tokens and withholds publish capability from everyone
 * but the host's camera on these sessions (see
 * `_resolve_source_publish_availability` and `resolve_stage_publish_availability`
 * in webinarseries/core/usecases.py), because the host composites their screen
 * and slides onto their own camera canvas and publishes one participant. So the
 * expected population is exactly one.
 *
 * The ordering below is a tie-breaker for the races that contract still allows —
 * a co-host token minted just before its grant was revoked, a source participant
 * still tearing down — not a layout in miniature. If you find yourself wanting to
 * rank tiles here, the session wants the stage path instead.
 */
export function resolveSoloPublisher(
  participants: WebiSalesProParticipant[],
): WebiSalesProParticipant | undefined {
  // Wrapped, not passed by reference: `isRenderable` takes options as its
  // second argument and `filter` would hand it the index.
  const publishing = participants.filter((participant) => isRenderable(participant));
  if (publishing.length === 0) return undefined;

  return (
    publishing.find(
      (participant) =>
        participantRole(participant) === "host" &&
        participantKind(participant) === "camera",
    ) ??
    publishing.find((participant) => participantRole(participant) === "host") ??
    publishing[0]
  );
}

/**
 * How many distinct publishers the connection can see.
 *
 * Used as the live signal that a session may have outgrown the solo path: a
 * second publisher can only hold a token if the backend started minting them,
 * which means `layout_setup_available` flipped — a co-host was granted while the
 * session was already live. Counted on role rather than on live video, so a
 * co-host who joins with their camera off still trips it.
 */
export function countPublishers(participants: WebiSalesProParticipant[]): number {
  const publisherIds = new Set(
    participants
      .filter((participant) => isPublishingRole(participantRole(participant)))
      .map((participant) => participant.participant.userId),
  );
  return publisherIds.size;
}

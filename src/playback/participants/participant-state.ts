import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";

/**
 * Who is publishing what — independent of how anything is arranged.
 *
 * This is transport vocabulary. It answers "is this participant sending video we
 * are allowed to render", which the solo path and the stage-layout path both
 * need. Arrangement — tiles, rails, spotlights, the stored definition — lives in
 * `src/playback/stage/stage-state.ts` and must not leak back in here: a session
 * without layout setup never loads that module at all, and the point of the
 * split is that it cannot start to by accident.
 */

/** Kinds that publish as their own participant rather than as a person. */
export const SOURCE_KINDS = ["screen", "presentation", "video_injection"];

/**
 * Roles the backend mints PUBLISH-capable tokens for — mirrors
 * STAGE_PUBLISHING_ROLES in webinarseries/core/usecases.py. An allowlist rather
 * than `!== "spectator"`: a role missing from the publishing set can still carry
 * a video track, and this renderer drops it, so admitting it in the console
 * would put a tile on the host's stage that no attendee can see. A screen share
 * inherits its sharer's role, so this covers those too.
 */
const PUBLISHING_ROLES = new Set(["host", "cohost", "presenter"]);

export function participantAttributes(participant: WebiSalesProParticipant) {
  return participant.participant.attributes as Record<string, unknown> | undefined;
}

export function participantRole(participant: WebiSalesProParticipant) {
  return participantAttributes(participant)?.role;
}

export function participantKind(participant: WebiSalesProParticipant) {
  return participantAttributes(participant)?.kind;
}

/**
 * Screen shares, presentations and video injections join as their own
 * participants. They are content, not people — which is what lets a renderer put
 * them on the main tile and keep them out of anywhere the app lists who is on
 * camera.
 *
 * Note the backend refuses these tokens entirely on a session without layout
 * setup (see _resolve_source_publish_availability): there the host composites
 * screen and slides onto their own camera canvas. So on the solo path this
 * predicate is expected to match nothing, and matching something means a token
 * outlived the gate.
 */
export function isSourceParticipant(participant: WebiSalesProParticipant) {
  return SOURCE_KINDS.includes(participantKind(participant) as string);
}

export function isLiveVideo(participant: WebiSalesProParticipant) {
  return (
    !participant.participant.videoStopped &&
    participant.streams.some((stream) => stream.mediaStreamTrack.kind === "video")
  );
}

export function isPublishingRole(participantRoleValue: unknown) {
  return (
    typeof participantRoleValue === "string" && PUBLISHING_ROLES.has(participantRoleValue)
  );
}

/** Publishing role plus a video track we actually hold. Nothing else is drawable. */
export function isRenderable(participant: WebiSalesProParticipant) {
  return isPublishingRole(participantRole(participant)) && isLiveVideo(participant);
}

export function hasActiveVideo(participant?: WebiSalesProParticipant) {
  return Boolean(participant && isLiveVideo(participant));
}

export function getParticipantName(participant?: WebiSalesProParticipant) {
  const name = participant?.participant.attributes?.name;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

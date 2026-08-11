import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import type {
  RailPlacement,
  StageRailSettings,
  StageSide,
  StageStateDefinition,
} from "@/broadcast/service/type";

/**
 * The attendee's arrangement resolver.
 *
 * Parity is the whole contract: keep this in sync with
 * `src/broadcast/service/attendee-stage-layout.ts` in webbysalespro-admin-webapp.
 * The host console derives its stage from that copy and tells the host it is
 * showing what the audience sees, so a difference here does not create a cosmetic
 * mismatch — it makes the console lie about what is going out.
 *
 * The layout is *derived*, never authored. The stored definition holds intent
 * only — which source owns the content slot, who is spotlit, how the rail is
 * drawn — and the tiles fall out of that plus who is publishing video right now.
 * An earlier version transported the tile assignment itself, which could not
 * represent "content plus two cameras" at all and went stale the moment a camera
 * toggled, because it named participants frozen at write time.
 */

export type StageArrangementShape = "off-air" | "gallery" | "feature";

export type ResolvedStageArrangement = {
  shape: StageArrangementShape;
  /** The main tile. Undefined only when off-air. On a gallery this is `tiles[0]`. */
  main?: WebiSalesProParticipant;
  /** Equal-weight tiles. Populated on the gallery shape, empty otherwise. */
  tiles: WebiSalesProParticipant[];
  /** Tiles beside or over the main one. Populated on the feature shape, empty otherwise. */
  rail: WebiSalesProParticipant[];
  /** Everyone being rendered, main included. */
  onStage: WebiSalesProParticipant[];
  /** How the rail is drawn. Only meaningful on the feature shape. */
  placement: RailPlacement;
  side: StageSide;
  /** What is on the main tile. */
  mainKind: "camera" | "screen" | "presentation" | "video_injection";
};

const DEFAULT_PLACEMENT: RailPlacement = "docked";
const DEFAULT_SIDE: StageSide = "right";
/** IVS caps a stage at 12 publishers, so more tiles than that cannot exist. */
const DEFAULT_MAX_TILES = 12;

/** Kinds that publish as their own participant and compete for the content slot. */
const SOURCE_KINDS = ["screen", "presentation", "video_injection"];

function attributes(participant: WebiSalesProParticipant) {
  return participant.participant.attributes as Record<string, unknown> | undefined;
}

function role(participant: WebiSalesProParticipant) {
  return attributes(participant)?.role;
}

function kind(participant: WebiSalesProParticipant) {
  return attributes(participant)?.kind;
}

/**
 * Screen shares, presentations and video injections join the stage as their own
 * participants. They are content, not people — which is what lets the same
 * derivation put them on the main tile and keep them out of anywhere the app
 * lists who is on camera.
 */
export function isSourceParticipant(participant: WebiSalesProParticipant) {
  return SOURCE_KINDS.includes(kind(participant) as string);
}

function isLiveVideo(participant: WebiSalesProParticipant) {
  return (
    !participant.participant.videoStopped &&
    participant.streams.some((stream) => stream.mediaStreamTrack.kind === "video")
  );
}

/**
 * Roles the backend mints PUBLISH-capable tokens for — mirrors
 * STAGE_PUBLISHING_ROLES in webinarseries/core/usecases.py. An allowlist rather
 * than `!== "spectator"`: a role missing from the publishing set can still carry a
 * video track, and this renderer drops it, so admitting it in the console would
 * put a tile on the host's stage that no attendee can see. A screen share
 * inherits its sharer's role, so this covers those too.
 */
const PUBLISHING_ROLES = new Set(["host", "cohost", "presenter"]);

export function isPublishingRole(participantRole: unknown) {
  return typeof participantRole === "string" && PUBLISHING_ROLES.has(participantRole);
}

function isRenderable(participant: WebiSalesProParticipant) {
  return isPublishingRole(role(participant)) && isLiveVideo(participant);
}

/** Content first, then the host — the order tiles are promoted in. */
function renderOrder(participants: WebiSalesProParticipant[]) {
  return participants.filter(isRenderable).sort((a, b) => {
    const aSource = isSourceParticipant(a) ? 0 : 1;
    const bSource = isSourceParticipant(b) ? 0 : 1;
    if (aSource !== bSource) return aSource - bSource;

    const aHost = role(a) === "host" ? 0 : 1;
    const bHost = role(b) === "host" ? 0 : 1;
    return aHost - bHost;
  });
}

/** Host first, then their camera — the ordering legacy single-canvas sessions get. */
function legacyFallbackOrder(participants: WebiSalesProParticipant[]) {
  return participants.filter(isRenderable).sort((a, b) => {
    const aHost = role(a) === "host" ? 0 : 1;
    const bHost = role(b) === "host" ? 0 : 1;
    if (aHost !== bHost) return aHost - bHost;

    const aCamera = kind(a) === "camera" ? 0 : 1;
    const bCamera = kind(b) === "camera" ? 0 : 1;
    return aCamera - bCamera;
  });
}

function findLive(participants: WebiSalesProParticipant[], participantId: string) {
  if (!participantId) return undefined;
  return participants.find(
    (participant) =>
      participant.participant.userId === participantId && isRenderable(participant),
  );
}

function resolveMainKind(
  main: WebiSalesProParticipant | undefined,
): ResolvedStageArrangement["mainKind"] {
  const value = main ? kind(main) : undefined;
  return SOURCE_KINDS.includes(value as string)
    ? (value as ResolvedStageArrangement["mainKind"])
    : "camera";
}

function railSettings(rail: StageRailSettings | undefined) {
  return {
    placement: rail?.placement ?? DEFAULT_PLACEMENT,
    side: rail?.side ?? DEFAULT_SIDE,
    maxTiles: rail?.max_tiles ?? DEFAULT_MAX_TILES,
  };
}

/**
 * The stage as every client draws it.
 *
 * Two shapes come out of this: a **gallery** of equal camera tiles (a gallery of
 * one is solo — do not special-case it), or a **feature** tile with a camera rail
 * (an empty rail is full-bleed — do not reserve rail space for it).
 *
 * `content` or `feature` naming someone who has left simply fails `findLive` and
 * falls through, so the arrangement self-heals with no event.
 */
export function resolveStageArrangement(
  definition: StageStateDefinition | undefined,
  participants: WebiSalesProParticipant[],
  stageStateEnabled = Boolean(definition),
): ResolvedStageArrangement {
  const { placement, side, maxTiles } = railSettings(definition?.rail);
  const base = { placement, side, tiles: [], rail: [], onStage: [] };

  // The legacy single-canvas path: one camera token with screen and presentation
  // composited into it, so there is exactly one track to show and no rail to
  // draw. `onStage` still lists everyone publishing, because a server-side
  // composition includes them even though this client only has the one track.
  if (!stageStateEnabled || !definition) {
    const legacyOrder = legacyFallbackOrder(participants);
    const main = legacyOrder[0];
    if (!main) return { ...base, shape: "off-air", mainKind: "camera" };
    return { ...base, shape: "feature", main, onStage: legacyOrder, mainKind: resolveMainKind(main) };
  }

  const renderable = renderOrder(participants);
  if (renderable.length === 0) return { ...base, shape: "off-air", mainKind: "camera" };

  // The spotlight wins, then the source holding the content slot, then any live
  // source at all — which covers the beat between a source publishing and its
  // claim landing.
  const main =
    findLive(renderable, definition.feature) ??
    findLive(renderable, definition.content) ??
    renderable.find(isSourceParticipant);

  // Nothing is privileged, so the cameras are peers: equal tiles rather than one
  // big frame with thumbnails next to it.
  if (!main) {
    const tiles = renderable.slice(0, maxTiles);
    return { ...base, shape: "gallery", main: tiles[0], tiles, onStage: tiles, mainKind: "camera" };
  }

  const rail = renderable
    .filter((participant) => participant.participant.userId !== main.participant.userId)
    .slice(0, maxTiles);

  return {
    ...base,
    shape: "feature",
    main,
    rail,
    onStage: [main, ...rail],
    mainKind: resolveMainKind(main),
  };
}

export function hasActiveVideo(participant?: WebiSalesProParticipant) {
  return Boolean(participant && isLiveVideo(participant));
}

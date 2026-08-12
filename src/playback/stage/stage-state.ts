import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import type {
  RailPlacement,
  StageRailSettings,
  StageSide,
  StageStateDefinition,
} from "@/broadcast/service/type";
import {
  SOURCE_KINDS,
  isRenderable,
  isSourceParticipant,
  participantRole,
} from "../participants/participant-state";

/**
 * The attendee's arrangement resolver.
 *
 * Only reached on sessions where layout setup applies. A session without it has
 * a single publisher and runs the solo path, which never loads this module —
 * that separation is deliberate, so do not reintroduce a "no layout" branch
 * here. See `src/playback/solo/solo-state.ts`.
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

/** Content first, then the host — the order tiles are promoted in. */
function renderOrder(participants: WebiSalesProParticipant[]) {
  return participants.filter(isRenderable).sort((a, b) => {
    const aSource = isSourceParticipant(a) ? 0 : 1;
    const bSource = isSourceParticipant(b) ? 0 : 1;
    if (aSource !== bSource) return aSource - bSource;

    const aHost = participantRole(a) === "host" ? 0 : 1;
    const bHost = participantRole(b) === "host" ? 0 : 1;
    return aHost - bHost;
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
  const value = main ? main.participant.attributes?.kind : undefined;
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
 * falls through, so the arrangement self-heals with no event. A missing
 * definition degrades the same way — the tiles still derive from who is
 * publishing, which is the right picture while the first state is in flight.
 */
export function resolveStageArrangement(
  definition: StageStateDefinition | undefined,
  participants: WebiSalesProParticipant[],
): ResolvedStageArrangement {
  const { placement, side, maxTiles } = railSettings(definition?.rail);
  const base = { placement, side, tiles: [], rail: [], onStage: [] };

  const renderable = renderOrder(participants);
  if (renderable.length === 0) return { ...base, shape: "off-air", mainKind: "camera" };

  // The spotlight wins, then the source holding the content slot, then any live
  // source at all — which covers the beat between a source publishing and its
  // claim landing.
  const main =
    findLive(renderable, definition?.feature ?? "") ??
    findLive(renderable, definition?.content ?? "") ??
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

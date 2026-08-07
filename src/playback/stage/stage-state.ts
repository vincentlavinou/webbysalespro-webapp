import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import type { StageStateDefinition } from "@/broadcast/service/type";

export type ResolvedStageLayout = {
  mode: "solo" | "pip" | "grid";
  main?: WebiSalesProParticipant;
  secondary?: WebiSalesProParticipant;
  pip?: Extract<StageStateDefinition, { mode: "pip" }>["secondary"];
  grid: WebiSalesProParticipant[];
};

function attributes(participant: WebiSalesProParticipant) {
  return participant.participant.attributes as Record<string, unknown> | undefined;
}

function isLiveVideo(participant: WebiSalesProParticipant) {
  return (
    !participant.participant.videoStopped &&
    participant.streams.some((stream) => stream.mediaStreamTrack.kind === "video")
  );
}

function role(participant: WebiSalesProParticipant) {
  return attributes(participant)?.role;
}

function kind(participant: WebiSalesProParticipant) {
  return attributes(participant)?.kind;
}

function isRenderable(participant: WebiSalesProParticipant) {
  const participantRole = role(participant);
  return (
    (participantRole === "host" || participantRole === "cohost") &&
    isLiveVideo(participant)
  );
}

function fallbackOrder(participants: WebiSalesProParticipant[]) {
  return participants
    .filter(isRenderable)
    .sort((a, b) => {
      const aScreen = kind(a) === "screen" ? 0 : 1;
      const bScreen = kind(b) === "screen" ? 0 : 1;
      if (aScreen !== bScreen) return aScreen - bScreen;

      const aHost = role(a) === "host" ? 0 : 1;
      const bHost = role(b) === "host" ? 0 : 1;
      return aHost - bHost;
    });
}

function legacyFallbackOrder(participants: WebiSalesProParticipant[]) {
  return participants
    .filter(isRenderable)
    .sort((a, b) => {
      const aHost = role(a) === "host" ? 0 : 1;
      const bHost = role(b) === "host" ? 0 : 1;
      if (aHost !== bHost) return aHost - bHost;

      const aCamera = kind(a) === "camera" ? 0 : 1;
      const bCamera = kind(b) === "camera" ? 0 : 1;
      return aCamera - bCamera;
    });
}

function findLive(
  participants: WebiSalesProParticipant[],
  participantId: string,
) {
  return participants.find(
    (participant) =>
      participant.participant.userId === participantId && isRenderable(participant),
  );
}

function resolveFeatured(
  featured: string,
  participants: WebiSalesProParticipant[],
) {
  return (featured && findLive(participants, featured)) || fallbackOrder(participants)[0];
}

export function resolveStageLayout(
  definition: StageStateDefinition | undefined,
  participants: WebiSalesProParticipant[],
  stageStateEnabled = Boolean(definition),
): ResolvedStageLayout {
  const liveParticipants = participants.filter(isRenderable);
  if (!stageStateEnabled || !definition) {
    return { mode: "solo", main: legacyFallbackOrder(participants)[0], grid: liveParticipants };
  }

  if (definition.mode === "grid") {
    const ordered = definition.grid.order
      .map((id) => findLive(participants, id))
      .filter((participant): participant is WebiSalesProParticipant => Boolean(participant));
    return { mode: "grid", grid: ordered.slice(0, definition.grid.max_tiles ?? 12), main: ordered[0] };
  }

  const main = resolveFeatured(definition.featured, participants);
  if (definition.mode === "solo" || !main) {
    return { mode: "solo", main, grid: liveParticipants };
  }

  const secondary = findLive(participants, definition.secondary.participant_id);
  if (!secondary || secondary.participant.userId === main.participant.userId) {
    return { mode: "solo", main, grid: liveParticipants };
  }

  return {
    mode: "pip",
    main,
    secondary,
    pip: definition.secondary,
    grid: [main, secondary],
  };
}

export function hasActiveVideo(participant?: WebiSalesProParticipant) {
  return Boolean(participant && isLiveVideo(participant));
}

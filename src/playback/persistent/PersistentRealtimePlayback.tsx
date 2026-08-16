"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RealtimeAttendeeStreamConfig, StageState } from "@/broadcast/service/type";
import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import { AttendeeStageCapabilityContext } from "../capability/AttendeeStageCapabilityContext";
import { useAttendeeStageCapability } from "../capability/use-attendee-stage-capability";
import { countPublishers, resolveSoloPublisher } from "../solo/solo-state";
import { StageArrangementContext } from "../stage/StageArrangementContext";
import { resolveStageArrangement } from "../stage/stage-state";
import { PlaybackSurfaceContext } from "../surface/PlaybackSurfaceContext";
import { PersistentMediaHost } from "../surface/PersistentMediaHost";
import { useRealtimeConnection } from "./use-realtime-connection";

type Props = {
  sessionId: string;
  stream: RealtimeAttendeeStreamConfig;
  layoutSupported?: boolean;
  initialStageState?: StageState;
  title?: string;
  artwork?: MediaImage[];
  children: React.ReactNode;
};

/**
 * The attendee's realtime playback root, and the one place that decides which
 * path this session is on.
 *
 * Two paths live under here and they share nothing but the connection:
 *
 * - **solo** — no layout setup, so the backend guarantees a single publisher and
 *   there is nothing to arrange. `resolveSoloPublisher` picks the video element's
 *   owner, no arrangement is computed, and StageArrangementContext stays null.
 * - **stage** — layout setup applies, so the arrangement is derived from the
 *   stored definition plus who is publishing (see `resolveStageArrangement`).
 *
 * The capability is hoisted here rather than read inside either path because it
 * can change while the attendee is watching: granting a co-host mid-session
 * flips `layout_setup_available`, and with it `applies_to_attendees`.
 *
 * One provider rather than two, deliberately. Swapping between two provider
 * components would put `children` under a different component type and unmount
 * the entire attendee experience — chat, offers, playback runtime — every time
 * the capability flipped. Keeping the transport and the tree fixed makes the
 * handover a change of resolver and nothing more.
 */
export function PersistentRealtimePlayback({
  sessionId,
  stream,
  layoutSupported,
  initialStageState,
  title,
  artwork,
  children,
}: Props) {
  const { stageLayoutEnabled, stageState, refresh } = useAttendeeStageCapability({
    sessionId,
    layoutSupported,
    initialStageState,
  });

  const stageDefinition =
    stageLayoutEnabled && stageState?.applies_to_attendees
      ? stageState.definition
      : undefined;

  // The main tile and the full arrangement come from the same pure resolver on
  // the same inputs, so the video element's owner and the rendered layout cannot
  // disagree about who is featured.
  const resolveMainParticipant = useCallback(
    (participants: WebiSalesProParticipant[]) =>
      stageLayoutEnabled
        // Always enabled on this branch: a session without layout setup takes
        // the solo path beside it and never reaches the resolver. The console
        // passes `Boolean(definition)` instead, because it has to handle legacy
        // single-canvas sessions itself.
        ? resolveStageArrangement(stageDefinition, participants, {
            stageStateEnabled: true,
          }).main
        : resolveSoloPublisher(participants),
    [stageDefinition, stageLayoutEnabled],
  );

  const connection = useRealtimeConnection({
    stream,
    resolveMainParticipant,
    title,
    artwork,
  });

  const arrangement = useMemo(
    () =>
      stageLayoutEnabled
        ? {
            layout: resolveStageArrangement(stageDefinition, connection.participants, {
              stageStateEnabled: true,
            }),
            stageDefinition,
          }
        : null,
    [connection.participants, stageDefinition, stageLayoutEnabled],
  );

  // A second publisher on a solo session means the backend started minting
  // tokens it withholds while layout setup is unavailable, so the capability is
  // stale. Edge-triggered: report the first crossing rather than every
  // participant update, and re-arm if the extra publisher leaves, so a co-host
  // cycling their connection cannot spin the refetch.
  const publisherCount = countPublishers(connection.participants);
  const reportedRef = useRef(false);
  useEffect(() => {
    if (stageLayoutEnabled || publisherCount <= 1) {
      reportedRef.current = false;
      return;
    }
    if (reportedRef.current) return;
    reportedRef.current = true;
    void refresh();
  }, [publisherCount, refresh, stageLayoutEnabled]);

  return (
    <AttendeeStageCapabilityContext.Provider value={stageLayoutEnabled}>
      <PlaybackSurfaceContext.Provider value={connection}>
        <StageArrangementContext.Provider value={arrangement}>
          <PersistentMediaHost
            videoRef={connection.videoRef}
            hiddenHostRef={connection.hiddenHostRef}
          />
          {children}
        </StageArrangementContext.Provider>
      </PlaybackSurfaceContext.Provider>
    </AttendeeStageCapabilityContext.Provider>
  );
}

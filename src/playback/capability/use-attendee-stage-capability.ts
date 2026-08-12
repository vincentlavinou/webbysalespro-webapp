"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StageState } from "@/broadcast/service/type";
import { getAttendeeStageStateAction } from "@/broadcast/service/action";
import { onAudienceChatEvent } from "@/audience-events/service/event-emitter";
import { onPlaybackMetadata } from "@/emitter/playback/playbackEventEmitter";
import { resolveStageLayoutEnabled } from "./stage-layout-capability";

type UseAttendeeStageCapabilityOptions = {
  sessionId: string;
  layoutSupported?: boolean;
  initialStageState?: StageState;
};

/**
 * Tracks whether the session currently supports attendee stage layout, and
 * carries the stage state that goes with it.
 *
 * Hoisted above both realtime providers on purpose. The answer can change while
 * the attendee is watching — granting a co-host mid-session flips
 * `layout_setup_available`, and with it `applies_to_attendees` — and neither
 * provider should have to know the other exists in order to hand over. This hook
 * owns the question; the providers each answer only their own half.
 */
export function useAttendeeStageCapability({
  sessionId,
  layoutSupported,
  initialStageState,
}: UseAttendeeStageCapabilityOptions) {
  const [stageState, setStageState] = useState<StageState | undefined>(initialStageState);
  const revisionRef = useRef(initialStageState?.revision ?? -1);

  const applyStageState = useCallback(
    (state: StageState) => {
      if (state.session_id !== sessionId) return;
      // Strictly-older only, where the arrangement path dedupes on `<=`. The
      // capability can change without the definition changing at all: granting a
      // co-host flips applies_to_attendees while `revision` stands still, so
      // dropping a same-revision payload here would strand the attendee on the
      // solo path for the rest of the session.
      if (state.revision < revisionRef.current) return;
      revisionRef.current = state.revision;
      setStageState(state);
    },
    [sessionId],
  );

  const refresh = useCallback(async () => {
    const result = await getAttendeeStageStateAction({ sessionId });
    if (result?.data) applyStageState(result.data);
  }, [applyStageState, sessionId]);

  useEffect(() => {
    const parseMetadata = (raw: string) => {
      try {
        const event = JSON.parse(raw) as { type?: string; payload?: StageState };
        if (event.type === "session:stage:state" && event.payload) applyStageState(event.payload);
      } catch {
        // Ignore unrelated or malformed metadata.
      }
    };

    const offMetadata = onPlaybackMetadata(parseMetadata);
    const offChat = onAudienceChatEvent((event) => {
      if (event.eventName !== "session:stage:state") return;
      try {
        const payload = event.attributes?.payload_json;
        if (payload) applyStageState(JSON.parse(payload) as StageState);
      } catch {
        // Ignore unrelated or malformed chat events.
      }
    });

    return () => {
      offMetadata();
      offChat();
    };
  }, [applyStageState]);

  // Refetch on stream refresh: the backend stops fanning stage-state events out
  // entirely while applies_to_attendees is false (_broadcast_stage_state returns
  // early), so on a solo session an event is not guaranteed to arrive when the
  // flag flips. A refresh is the attendee's own way back to the truth.
  useEffect(() => {
    const handleStreamRefresh = () => {
      void refresh();
    };
    window.addEventListener("webinar:stream:refresh", handleStreamRefresh);
    return () => window.removeEventListener("webinar:stream:refresh", handleStreamRefresh);
  }, [refresh]);

  return {
    stageLayoutEnabled: resolveStageLayoutEnabled(layoutSupported, stageState),
    stageState,
    refresh,
  };
}

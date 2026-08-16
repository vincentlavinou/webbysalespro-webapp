"use client";

import { useCallback, useEffect, useState } from "react";
import { nextStageState } from "@lavinou/webbysalespro/stage";
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

  /**
   * The shared ordering rule, replacing the revision ref this used to keep.
   *
   * Same semantics it always had — a same-revision payload is kept, because
   * granting a co-host flips `applies_to_attendees` while `revision` stands
   * still and dropping it would strand the attendee on the solo path for the
   * rest of the session. The package now narrows that to "kept when a derived
   * field actually differs", so an identical payload arriving over both the
   * metadata and chat transports no longer causes a second render.
   *
   * Every source goes through this: metadata, chat, and the hydration refetch
   * below. A refetch in flight when an event lands comes back older than what
   * we hold, and comparing revisions is what makes that harmless.
   */
  const applyStageState = useCallback(
    (state: StageState) => {
      setStageState((current) => nextStageState(current, state, { sessionId }));
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
  //
  // This is this surface's hydration trigger — see the `event-hydration` skill.
  // `useAttendeeStreamRefresh` dispatches the event on return to visible, on
  // window focus after a blur, on a bfcache restore, and on a manual refresh,
  // so this covers every way an attendee comes back to a tab that may have
  // missed events. There is no subscribe callback to hang off here: the
  // transports are IVS timed metadata and audience chat, not a Pusher channel.
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

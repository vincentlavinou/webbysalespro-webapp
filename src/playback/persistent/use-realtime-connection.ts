"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SubscribeType } from "amazon-ivs-web-broadcast";
import { emitPlaybackPlaying } from "@/emitter/playback";
import { setSharedAudioContext } from "@/chat/hooks/use-cta-announcements";
import { joinStage, leaveStage } from "@/broadcast/service/utils";
import type { RealtimeAttendeeStreamConfig, Strategy } from "@/broadcast/service/type";
import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import {
  getParticipantName,
  hasActiveVideo,
  isPublishingRole,
  participantRole,
} from "../participants/participant-state";
import { useMediaSession } from "../player/ivs/hooks/use-media-session";
import { useVisibilityResilience } from "../player/ivs/hooks/use-visibility-resilience";
import type {
  PlaybackSurfaceMode,
  PlaybackSurfaceState,
} from "../surface/PlaybackSurfaceContext";

type Stage = import("amazon-ivs-web-broadcast").Stage;
type StageParticipantInfo = import("amazon-ivs-web-broadcast").StageParticipantInfo;

type UseRealtimeConnectionOptions = {
  stream: RealtimeAttendeeStreamConfig;
  /**
   * Which participant owns the persistent video element.
   *
   * Injected rather than derived, so this hook holds no notion of arrangement:
   * the solo path passes the single-publisher rule, the layout path passes its
   * resolver. Must be stable (useCallback) — it keys the attachment effect.
   */
  resolveMainParticipant: (
    participants: WebiSalesProParticipant[],
  ) => WebiSalesProParticipant | undefined;
  title?: string;
  artwork?: MediaImage[];
};

export type RealtimeConnection = PlaybackSurfaceState & {
  participants: WebiSalesProParticipant[];
};

/**
 * The attendee's realtime transport: join, subscribe, and keep one video element
 * playing.
 *
 * Everything here is true of any realtime session — a solo host compositing onto
 * their own canvas, or a multi-publisher stage being arranged from the console.
 * Nothing here reads or fetches stage state; a caller that needs an arrangement
 * layers it on top by way of `resolveMainParticipant`.
 *
 * "Stage" appears below only as the AWS IVS primitive both paths connect to
 * (`joinStage`/`leaveStage`). It carries none of the stage-*layout* meaning that
 * lives in src/playback/stage — keeping those two senses of the word apart is
 * the whole reason this module exists.
 */
export function useRealtimeConnection({
  stream,
  resolveMainParticipant,
  title,
  artwork,
}: UseRealtimeConnectionOptions): RealtimeConnection {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenHostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | undefined>(undefined);
  const localParticipantRef = useRef<StageParticipantInfo | undefined>(undefined);

  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<WebiSalesProParticipant[]>([]);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [surfaceMode, setSurfaceMode] = useState<PlaybackSurfaceMode>("loading");
  const [aspectRatio, setAspectRatio] = useState("aspect-video");

  const mainParticipant = useMemo(
    () => resolveMainParticipant(participants),
    [participants, resolveMainParticipant],
  );
  const mainParticipantHasActiveVideo = useMemo(
    () => hasActiveVideo(mainParticipant),
    [mainParticipant],
  );
  const participantName = useMemo(
    () => getParticipantName(mainParticipant),
    [mainParticipant],
  );

  const strategy = useMemo<Strategy>(
    () => ({
      updateTracks: () => {},
      setMainPresenter: () => {},
      stageStreamsToPublish: () => [],
      shouldPublishParticipant: () => false,
      // Must stay in step with isRenderable: a publisher we decline to
      // subscribe to has no tracks, so it can never satisfy isLiveVideo and
      // drops out of whatever tile a renderer assigned it.
      shouldSubscribeToParticipant: (participant) =>
        (isPublishingRole(participant.attributes?.role)
          ? "audio_video"
          : "none") as SubscribeType,
      subscribeConfiguration: () => ({ inBandMessaging: { enabled: true } }),
    }),
    [],
  );

  // Join the stage. The cleanup does NOT call leaveStage — the connection
  // persists through UI unmounts (layout switches, route changes,
  // backgrounding). leaveStage is only called by reconnectStage (explicit
  // reconnect) or the unmount-only effect below (true session end).
  const prevTokenRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const token = stream.config.participant_token;

    // If the token changed, leave the old stage before joining the new one.
    if (prevTokenRef.current && prevTokenRef.current !== token) {
      void leaveStage(setIsConnected, stageRef.current);
      stageRef.current = undefined;
      localParticipantRef.current = undefined;
      setParticipants([]);
      setIsConnected(false);
    }
    prevTokenRef.current = token;

    void joinStage(
      true,
      token,
      setIsConnected,
      setParticipants,
      stageRef,
      localParticipantRef,
      strategy,
      () => {},
    );
  }, [connectionAttempt, stream.config.participant_token, strategy]);

  // True session end — only fires when the owning provider unmounts.
  useEffect(() => {
    const stageRefSnapshot = stageRef;
    return () => {
      void leaveStage(setIsConnected, stageRefSnapshot.current);
    };
  }, []);

  // Assign WebRTC tracks to the persistent video element when the main
  // participant or their tracks change. Does NOT null srcObject on cleanup —
  // that would kill audio during layout switches.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!mainParticipant || !mainParticipantHasActiveVideo) {
      video.srcObject = null;
      setSurfaceMode("loading");
      return;
    }

    let videoTrack: MediaStreamTrack | undefined;
    let audioTrack: MediaStreamTrack | undefined;

    mainParticipant.streams.forEach(({ mediaStreamTrack }) => {
      if (!videoTrack && mediaStreamTrack.kind === "video") videoTrack = mediaStreamTrack;
      if (!audioTrack && mediaStreamTrack.kind === "audio") audioTrack = mediaStreamTrack;
    });

    if (!videoTrack) {
      video.srcObject = null;
      setSurfaceMode("loading");
      return;
    }

    const { width, height } = videoTrack.getSettings?.() ?? {};
    if (width && height) {
      const ratio = width / height;
      if (Math.abs(ratio - 4 / 3) < 0.1) setAspectRatio("aspect-[4/3]");
      else if (Math.abs(ratio - 16 / 9) < 0.1) setAspectRatio("aspect-video");
      else setAspectRatio("aspect-auto");
    } else {
      setAspectRatio("aspect-video");
    }

    video.srcObject = new MediaStream(audioTrack ? [videoTrack, audioTrack] : [videoTrack]);
    video.muted = false;
    video.defaultMuted = false;

    const tryPlay = async () => {
      try {
        await video.play();
        setSharedAudioContext(video);
        setSurfaceMode("playing");
      } catch {
        if (!video.muted) {
          video.muted = true;
          video.defaultMuted = true;
          await video.play().catch(() => {});
        }
        setSurfaceMode(video.paused ? "blocked" : "playing-muted");
        if (!video.paused) setSharedAudioContext(video);
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      void tryPlay();
    } else {
      const onLoaded = () => { void tryPlay(); };
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      return () => video.removeEventListener("loadedmetadata", onLoaded);
    }
  }, [mainParticipant, mainParticipantHasActiveVideo]);

  /**
   * Audio from publishers who are not on the main tile.
   *
   * This is the whole path for a co-host who has their camera off and their mic
   * on: nothing renders them, so the persistent video element never carries
   * their track and they are only ever heard through here.
   *
   * Reconciled per participant rather than rebuilt. The previous version tore
   * every element down and recreated it on each `participants` update — which is
   * every stream event — so a co-host's audio restarted constantly, and each
   * restart was a fresh play() that could be refused.
   */
  const secondaryAudioRef = useRef(new Map<string, HTMLAudioElement>());
  useEffect(() => {
    const host = hiddenHostRef.current;
    if (!host) return;

    const elements = secondaryAudioRef.current;
    const video = videoRef.current;

    const wanted = new Map<string, MediaStreamTrack>();
    participants.forEach((participant) => {
      if (participant.participant.userId === mainParticipant?.participant.userId) return;
      if (!isPublishingRole(participantRole(participant))) return;
      const audioTrack = participant.streams.find(
        ({ mediaStreamTrack }) => mediaStreamTrack.kind === "audio",
      )?.mediaStreamTrack;
      if (audioTrack) wanted.set(participant.participant.id, audioTrack);
    });

    elements.forEach((audio, participantId) => {
      const track = wanted.get(participantId);
      if (track && audio.dataset.trackId === track.id) return;
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      elements.delete(participantId);
    });

    wanted.forEach((track, participantId) => {
      if (elements.has(participantId)) return;
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.dataset.trackId = track.id;
      // Follows the main element: while autoplay has the stage muted, a co-host
      // must not be the one voice that comes through.
      audio.muted = video?.muted ?? false;
      audio.srcObject = new MediaStream([track]);
      host.appendChild(audio);
      void audio.play().catch(() => {});
      elements.set(participantId, audio);
    });
  }, [participants, mainParticipant?.participant.userId, hiddenHostRef, videoRef]);

  // Follow the main element through mute and autoplay transitions. Without this
  // the tap-to-unmute gesture reached only the main video: a co-host whose audio
  // element was created while autoplay was blocked stayed silent for the rest of
  // the session, with nothing left to retry it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    secondaryAudioRef.current.forEach((audio) => {
      audio.muted = video.muted;
      if (!video.paused) void audio.play().catch(() => {});
    });
  }, [surfaceMode, videoRef]);

  // Torn down only when the connection itself goes away — the effect above owns
  // the per-participant lifecycle.
  useEffect(() => {
    const elements = secondaryAudioRef.current;
    return () => {
      elements.forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      });
      elements.clear();
    };
  }, []);

  // Keep surfaceMode in sync with video element play/pause/mute events.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sync = () => {
      if (!video.srcObject) { setSurfaceMode("loading"); return; }
      if (video.paused) { setSurfaceMode("blocked"); return; }
      setSurfaceMode(video.muted ? "playing-muted" : "playing");
    };

    const events: Array<keyof HTMLMediaElementEventMap> = [
      "play", "playing", "pause", "volumechange",
    ];
    events.forEach((e) => video.addEventListener(e, sync));
    return () => events.forEach((e) => video.removeEventListener(e, sync));
  }, []);

  // Emit playing event when the stream goes live.
  useEffect(() => {
    if (isConnected && mainParticipantHasActiveVideo) {
      emitPlaybackPlaying();
    }
  }, [isConnected, mainParticipantHasActiveVideo]);

  // Prevent the browser from keeping the stream paused when backgrounded.
  const hasPlayedRef = useRef(false);
  useEffect(() => {
    if (surfaceMode === "playing" || surfaceMode === "playing-muted") {
      hasPlayedRef.current = true;
    }
  }, [surfaceMode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPause = () => {
      if (!hasPlayedRef.current) return;
      video.play().catch(() => {});
    };
    video.addEventListener("pause", onPause);
    return () => video.removeEventListener("pause", onPause);
  }, []);

  const restoreToLiveForVisibility = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.paused === false) return;
    video.play().catch(() => {});
  }, []);

  useVisibilityResilience({
    enabled: true,
    videoRef,
    hasPlayedRef,
    restoreToLive: restoreToLiveForVisibility,
  });

  const reconnectStage = useCallback(async () => {
    const current = stageRef.current;
    stageRef.current = undefined;
    localParticipantRef.current = undefined;
    setParticipants([]);
    setIsConnected(false);
    if (current) await leaveStage(setIsConnected, current);
    setConnectionAttempt((n) => n + 1);
  }, []);

  const handleStartPlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = false;
      video.defaultMuted = false;
      await video.play();
      setSharedAudioContext(video);
      setSurfaceMode("playing");
    } catch {
      video.muted = true;
      video.defaultMuted = true;
      await video.play().catch(() => {});
      if (!video.paused) setSharedAudioContext(video);
      setSurfaceMode(video.paused ? "blocked" : "playing-muted");
    }
  }, []);

  const handleUnmute = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.defaultMuted = false;
    try {
      await video.play();
      setSharedAudioContext(video);
      setSurfaceMode("playing");
    } catch {
      video.muted = true;
      video.defaultMuted = true;
      setSurfaceMode("playing-muted");
    }
  }, []);

  useMediaSession({
    active: surfaceMode === "playing" || surfaceMode === "playing-muted",
    title: participantName ? `${participantName} — ${title ?? "Live Webinar"}` : (title ?? "Live Webinar"),
    ariaLabel: "Live Webinar",
    artwork,
    onPlay: () => { videoRef.current?.play().catch(() => {}); },
    onPause: () => { videoRef.current?.play().catch(() => {}); },
  });

  return {
    videoRef,
    hiddenHostRef,
    isConnected,
    participants,
    mainParticipant,
    mainParticipantHasActiveVideo,
    participantName,
    surfaceMode,
    aspectRatio,
    reconnectStage,
    handleStartPlayback,
    handleUnmute,
  };
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SubscribeType } from "amazon-ivs-web-broadcast";
import { emitPlaybackPlaying } from "@/emitter/playback";
import { setSharedAudioContext } from "@/chat/hooks/use-cta-announcements";
import { joinStage, leaveStage } from "@/broadcast/service/utils";
import type { RealtimeAttendeeStreamConfig, Strategy } from "@/broadcast/service/type";
import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import { useMediaSession } from "../player/ivs/hooks/use-media-session";
import { usePiP } from "../player/ivs/hooks/use-pip";
import { useVisibilityResilience } from "../player/ivs/hooks/use-visibility-resilience";
import {
  PersistentStagePlaybackContext,
  type StageSurfaceMode,
} from "./PersistentStagePlaybackContext";

type Stage = import("amazon-ivs-web-broadcast").Stage;
type StageParticipantInfo = import("amazon-ivs-web-broadcast").StageParticipantInfo;

type Props = {
  stream: RealtimeAttendeeStreamConfig;
  title?: string;
  artwork?: MediaImage[];
  children: React.ReactNode;
};

function selectPrimaryParticipant(participants: WebiSalesProParticipant[]) {
  const eligible = participants.filter(({ participant }) => {
    const role = participant.attributes?.role;
    return role === "host" || role === "presenter";
  });
  const candidates = eligible.length > 0 ? eligible : participants;
  return (
    candidates.find(({ participant, streams }) => {
      if (participant.videoStopped) return false;
      return streams.some((s) => s.mediaStreamTrack.kind === "video");
    }) ?? candidates[0]
  );
}

function participantHasActiveVideo(participant?: WebiSalesProParticipant) {
  if (!participant || participant.participant.videoStopped) return false;
  return participant.streams.some((s) => s.mediaStreamTrack.kind === "video");
}

function getPresenterName(participant?: WebiSalesProParticipant) {
  const name = participant?.participant.attributes?.name;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

export function PersistentStagePlaybackProvider({
  stream,
  title,
  artwork,
  children,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenHostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | undefined>(undefined);
  const localParticipantRef = useRef<StageParticipantInfo | undefined>(undefined);

  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<WebiSalesProParticipant[]>([]);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [surfaceMode, setSurfaceMode] = useState<StageSurfaceMode>("loading");
  const [aspectRatio, setAspectRatio] = useState("aspect-video");

  const mainParticipant = useMemo(
    () => selectPrimaryParticipant(participants),
    [participants],
  );
  const mainParticipantHasActiveVideo = useMemo(
    () => participantHasActiveVideo(mainParticipant),
    [mainParticipant],
  );
  const presenterName = useMemo(
    () => getPresenterName(mainParticipant),
    [mainParticipant],
  );

  const strategy = useMemo<Strategy>(
    () => ({
      updateTracks: () => {},
      setMainPresenter: () => {},
      stageStreamsToPublish: () => [],
      shouldPublishParticipant: () => false,
      shouldSubscribeToParticipant: (participant) => {
        const role = participant.attributes?.role;
        if (!role || role === "host" || role === "presenter") {
          return "audio_video" as SubscribeType;
        }
        return "none" as SubscribeType;
      },
      subscribeConfiguration: () => ({ inBandMessaging: { enabled: true } }),
    }),
    [],
  );

  // Join the stage. The cleanup does NOT call leaveStage — the stage persists
  // through UI unmounts (layout switches, route changes, backgrounding).
  // leaveStage is only called by reconnectStage (explicit reconnect) or the
  // unmount-only effect below (true session end).
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

  // True session end — only fires when the provider itself unmounts.
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

  // Emit playing event when stage goes live.
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

  const pip = usePiP(videoRef, restoreToLiveForVisibility);

  useVisibilityResilience({
    enabled: true,
    videoRef,
    hasPlayedRef,
    isPiPRef: pip.isPiPRef,
    enterPiP: pip.enterPiP,
    exitPiP: pip.exitPiP,
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
    title: presenterName ? `${presenterName} — ${title ?? "Live Webinar"}` : (title ?? "Live Webinar"),
    ariaLabel: "Live Webinar",
    artwork,
    onPlay: () => { videoRef.current?.play().catch(() => {}); },
    onPause: () => { videoRef.current?.play().catch(() => {}); },
  });

  return (
    <PersistentStagePlaybackContext.Provider
      value={{
        videoRef,
        hiddenHostRef,
        isConnected,
        mainParticipant,
        mainParticipantHasActiveVideo,
        presenterName,
        surfaceMode,
        aspectRatio,
        reconnectStage,
        handleStartPlayback,
        handleUnmute,
      }}
    >
      {/*
        Always-mounted hidden host — keeps WebRTC audio alive when the
        player view unmounts during layout switches or navigation.
      */}
      <div
        ref={hiddenHostRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          width: 0,
          height: 0,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -9999,
        }}
      >
        <video
          ref={videoRef}
          playsInline
          style={{ width: 0, height: 0 }}
        />
      </div>
      {children}
    </PersistentStagePlaybackContext.Provider>
  );
}

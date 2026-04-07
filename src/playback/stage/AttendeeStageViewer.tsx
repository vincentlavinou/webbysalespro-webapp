"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SubscribeType } from "amazon-ivs-web-broadcast";
import { emitPlaybackPlaying } from "@/emitter/playback";
import { ParticipantVideoProvider } from "@/broadcast/provider/ParticipantVideoProvider";
import { useParticipantVideo } from "@/broadcast/hooks/use-participant-video";
import { joinStage, leaveStage } from "@/broadcast/service/utils";
import {
  RealtimeAttendeeStreamConfig,
  Strategy,
} from "@/broadcast/service/type";
import { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import { WebinarMainLayoutLoading } from "@/broadcast/components/views/WebinarMainLayoutLoading";
import { PlaybackStatus } from "../context/PlaybackRuntimeContext";

type Stage = import("amazon-ivs-web-broadcast").Stage;
type StageParticipantInfo = import("amazon-ivs-web-broadcast").StageParticipantInfo;

type AttendeeStageViewerProps = {
  stream: RealtimeAttendeeStreamConfig;
  onPlaybackStatusChange?: (status: PlaybackStatus) => void;
};

type StageSurfaceMode = "loading" | "blocked" | "playing" | "playing-muted";

function selectPrimaryParticipant(participants: WebiSalesProParticipant[]) {
  const eligibleParticipants = participants.filter((participant) => {
    const role = participant.participant.attributes?.role;
    return role === "host" || role === "presenter";
  });

  const candidates =
    eligibleParticipants.length > 0 ? eligibleParticipants : participants;

  return (
    candidates.find((participant) =>
      participant.streams.some((stream) => stream.mediaStreamTrack.kind === "video"),
    ) ?? candidates[0]
  );
}

function StageParticipantCard() {
  const { screenShareRef, cameraRef, isScreenShare, aspectRatio } =
    useParticipantVideo();
  const resolvedScreenShareRef = screenShareRef ?? { current: null };
  const resolvedCameraRef = cameraRef ?? { current: null };
  const [surfaceMode, setSurfaceMode] = useState<StageSurfaceMode>("loading");

  const activeVideoElement =
    (isScreenShare
      ? resolvedScreenShareRef.current
      : resolvedCameraRef.current) ?? null;

  useEffect(() => {
    const video = activeVideoElement;
    if (!video) {
      setSurfaceMode("loading");
      return;
    }

    const syncMode = () => {
      if (!video.srcObject) {
        setSurfaceMode("loading");
        return;
      }

      if (video.paused) {
        setSurfaceMode("blocked");
        return;
      }

      setSurfaceMode(video.muted ? "playing-muted" : "playing");
    };

    syncMode();

    const events: Array<keyof HTMLMediaElementEventMap> = [
      "loadedmetadata",
      "canplay",
      "play",
      "playing",
      "pause",
      "volumechange",
    ];

    events.forEach((eventName) => {
      video.addEventListener(eventName, syncMode);
    });

    return () => {
      events.forEach((eventName) => {
        video.removeEventListener(eventName, syncMode);
      });
    };
  }, [activeVideoElement]);

  const handleStartPlayback = async () => {
    const video = activeVideoElement;
    if (!video) return;

    try {
      video.muted = false;
      video.defaultMuted = false;
      await video.play();
      setSurfaceMode("playing");
    } catch {
      video.muted = true;
      video.defaultMuted = true;
      await video.play().catch(() => {});
      setSurfaceMode(video.paused ? "blocked" : "playing-muted");
    }
  };

  const handleUnmute = async () => {
    const video = activeVideoElement;
    if (!video) return;

    video.muted = false;
    video.defaultMuted = false;
    try {
      await video.play();
      setSurfaceMode("playing");
    } catch {
      video.muted = true;
      video.defaultMuted = true;
      setSurfaceMode("playing-muted");
    }
  };

  return (
    <div
      className={`w-full max-h-[80vh] ${aspectRatio} overflow-hidden rounded-md border bg-black relative`}
    >
      <video
        ref={isScreenShare ? resolvedScreenShareRef : resolvedCameraRef}
        autoPlay
        playsInline
        muted={false}
        className="h-full w-full object-contain"
      />

      {isScreenShare ? (
        <div className="absolute bottom-3 right-3 w-40 aspect-video overflow-hidden rounded border-2 shadow-lg">
          <video
            ref={resolvedCameraRef}
            autoPlay
            playsInline
            muted={false}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      {surfaceMode === "blocked" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => void handleStartPlayback()}
            className="flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-gray-900 shadow-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 translate-x-[1px]">
                <polygon points="6,4 20,12 6,20" fill="currentColor" />
              </svg>
            </span>
            <span>Tap to start the live webinar</span>
          </button>
        </div>
      ) : null}

      {surfaceMode === "playing-muted" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => void handleUnmute()}
            className="flex flex-col items-center gap-3 rounded-2xl bg-black/80 px-8 py-6 text-white shadow-xl backdrop-blur-sm hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <svg viewBox="0 0 24 24" className="h-10 w-10 shrink-0" fill="currentColor" aria-hidden="true">
              <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.21 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27 7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21 21 19.73 12 10.73 4.27 3ZM12 4L9.91 6.09 12 8.18V4Z" />
            </svg>
            <span className="text-base font-semibold">Tap to unmute</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AttendeeStageViewer({
  stream,
  onPlaybackStatusChange,
}: AttendeeStageViewerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<WebiSalesProParticipant[]>([]);
  const stageRef = useRef<Stage | undefined>(undefined);
  const localParticipantRef = useRef<StageParticipantInfo | undefined>(undefined);
  const joinAttemptedRef = useRef(false);

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
      subscribeConfiguration: () => ({
        inBandMessaging: {
          enabled: true,
        },
      }),
    }),
    [],
  );

  const mainParticipant = useMemo(
    () => selectPrimaryParticipant(participants),
    [participants],
  );

  useEffect(() => {
    if (joinAttemptedRef.current) return;
    joinAttemptedRef.current = true;
    onPlaybackStatusChange?.("loading");
    const currentStageRef = stageRef;

    void joinStage(
      true,
      stream.config.participant_token,
      setIsConnected,
      setParticipants,
      stageRef,
      localParticipantRef,
      strategy,
      () => {},
    );

    return () => {
      void leaveStage(setIsConnected, currentStageRef.current);
    };
  }, [onPlaybackStatusChange, strategy, stream.config.participant_token]);

  useEffect(() => {
    if (!isConnected) {
      onPlaybackStatusChange?.("loading");
      return;
    }

    if (!mainParticipant) {
      onPlaybackStatusChange?.("ready");
      return;
    }

    emitPlaybackPlaying();
    onPlaybackStatusChange?.("playing");
  }, [isConnected, mainParticipant, onPlaybackStatusChange]);

  if (!isConnected || !mainParticipant) {
    return <WebinarMainLayoutLoading aspectClassName="aspect-video" />;
  }

  return (
    <ParticipantVideoProvider participant={mainParticipant}>
      <StageParticipantCard />
    </ParticipantVideoProvider>
  );
}

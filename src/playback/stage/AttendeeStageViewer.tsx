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

  return (
    <div
      className={`w-full max-h-[80vh] ${aspectRatio} overflow-hidden rounded-md border bg-black relative`}
    >
      <video
        ref={isScreenShare ? screenShareRef : cameraRef}
        autoPlay
        playsInline
        muted={false}
        className="h-full w-full object-contain"
      />

      {isScreenShare ? (
        <div className="absolute bottom-3 right-3 w-40 aspect-video overflow-hidden rounded border-2 shadow-lg">
          <video
            ref={cameraRef}
            autoPlay
            playsInline
            muted={false}
            className="h-full w-full object-cover"
          />
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

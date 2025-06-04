'use client';

import { RefObject } from "react";
import { DeviceType } from "../enum";

// ✅ Type-only imports to fix SSR issues
type Stage = import("amazon-ivs-web-broadcast").Stage;
type StageEvents = import("amazon-ivs-web-broadcast").StageEvents;
type StageParticipantInfo = import("amazon-ivs-web-broadcast").StageParticipantInfo;
type StageStrategy = import("amazon-ivs-web-broadcast").StageStrategy;
type StageStream = import("amazon-ivs-web-broadcast").StageStream;
type LocalStageStream = import("amazon-ivs-web-broadcast").LocalStageStream;
type SubscribeType = import("amazon-ivs-web-broadcast").SubscribeType;
type ConnectionState = import("amazon-ivs-web-broadcast").ConnectionState;

export interface LocalParticipantInfo {
  audioStream: LocalStageStream;
  videoStream: LocalStageStream;
}

export const toggleMedia = (
  deviceType: DeviceType,
  setIsDeviceMuted: (state: boolean) => void,
  localParticipantRef?: RefObject<LocalParticipantInfo | null>
): void => {
  if (!localParticipantRef?.current) return;

  const stream =
    deviceType === DeviceType.MIC
      ? localParticipantRef.current.audioStream
      : localParticipantRef.current.videoStream;

  const isMuted = stream.isMuted;
  stream.setMuted(!isMuted);
  setIsDeviceMuted(!isMuted);
};

export const getDevices = async () => {
  await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  const devices = await navigator.mediaDevices.enumerateDevices();

  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  const audioDevices = devices.filter((d) => d.kind === "audioinput");

  return { videoDevices, audioDevices };
};

export const getMediaForDevices = async (
  deviceId: string,
  mediaType: DeviceType
): Promise<MediaStream> => {
  const constraints: MediaStreamConstraints = {
    video:
      mediaType === DeviceType.CAMERA && deviceId
        ? { deviceId: { exact: deviceId } }
        : false,
    audio:
      mediaType === DeviceType.MIC && deviceId
        ? { deviceId: { exact: deviceId } }
        : false,
  };
  return navigator.mediaDevices.getUserMedia(constraints);
};

interface Strategy extends StageStrategy {
  audioTrack?: LocalStageStream;
  videoTrack?: LocalStageStream;
  updateTracks: (audio: LocalStageStream, video: LocalStageStream) => void
}

export const createLocalStageStream = async (
  deviceId: string | null,
  deviceType: DeviceType
): Promise<LocalStageStream | undefined> => {
  if (!deviceId) return;

  const mediaStream = await getMediaForDevices(deviceId, deviceType);
  const track =
    deviceType === DeviceType.CAMERA
      ? mediaStream.getVideoTracks()[0]
      : mediaStream.getAudioTracks()[0];

  const { LocalStageStream } = await import("amazon-ivs-web-broadcast");
  return new LocalStageStream(track);
};

export const setupStrategy = async (): Promise<Strategy> => {
  const { SubscribeType } = await import("amazon-ivs-web-broadcast");

  const strategy: Strategy = {
    audioTrack: undefined,
    videoTrack: undefined,

    updateTracks(audio, video) {
      this.audioTrack = audio;
      this.videoTrack = video;
    },

    stageStreamsToPublish() {
      return [this.audioTrack!, this.videoTrack!];
    },

    shouldPublishParticipant() {
      return true;
    },

    shouldSubscribeToParticipant() {
      return SubscribeType.AUDIO_VIDEO;
    },
  };

  return strategy;
};

export const joinStage = async (
  isInit: boolean,
  participantToken: string,
  micId: string | null,
  camId: string | null,
  setIsConnected: (connected: boolean) => void,
  setIsMicMuted: (muted: boolean) => void,
  setLocalParticipant: (p: { participant: StageParticipantInfo; streams: StageStream[] }) => void,
  setParticipants: React.Dispatch<React.SetStateAction<{ participant: StageParticipantInfo; streams: StageStream[] }[]>>,
  strategyRef: RefObject<StageStrategy | null>,
  stageRef: RefObject<Stage | null>,
  localParticipantRef: RefObject<LocalParticipantInfo | null>
): Promise<void> => {
  if (!isInit) return;

  const [videoStream, audioStream] = await Promise.all([
    createLocalStageStream(camId, DeviceType.CAMERA),
    createLocalStageStream(micId, DeviceType.MIC),
  ]);

  if (!videoStream || !audioStream) return;

  const strategy = await setupStrategy();
  strategy.updateTracks(audioStream, videoStream);
  strategyRef.current = strategy;

  localParticipantRef.current = { audioStream, videoStream };

  const { Stage, StageEvents, ConnectionState } = await import("amazon-ivs-web-broadcast");
  const stage = new Stage(participantToken, strategy);

  stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state: string) => {
    setIsConnected(state === ConnectionState.CONNECTED);
    audioStream.setMuted(true);
    setIsMicMuted(true);
  });

  stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, streams) => {
    if (participant.isLocal) {
      setLocalParticipant({ participant, streams });
    } else {
      setParticipants((prev) =>
        prev.some((p) => p.participant.id === participant.id)
          ? prev
          : [...prev, { participant, streams }]
      );
    }
  });

  stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (participant) => {
    setParticipants((prev) =>
      prev.filter(({ participant: p }) => p.id !== participant.id)
    );
  });

  try {
    await stage.join();
    stageRef.current = stage;
  } catch (err) {
    console.error("Failed to join stage:", err);
    stageRef.current = null;
  }
};

export const leaveStage = async (
  setIsConnected: (connected: boolean) => void,
  stage?: Stage
): Promise<void> => {
  if (stage) {
    stage.leave();
    setIsConnected(false);
  }
};

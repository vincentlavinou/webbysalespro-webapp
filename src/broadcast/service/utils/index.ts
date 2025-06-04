'use client'
import { RefObject } from "react";
import { DeviceType } from "../enum";
import { 
    LocalStageStream, 
    StageStrategy, 
    StageStream, 
    Stage, 
    StageParticipantInfo, 
    SubscribeType, 
    StageEvents, 
    ConnectionState  
} from "amazon-ivs-web-broadcast";

export interface LocalParticipantInfo {
    audioStream: LocalStageStream;
    videoStream: LocalStageStream;
}

export const toggleMedia = (
  deviceType: DeviceType,
  setIsDeviceMuted: (state: boolean) => void,
  localParticipantRef?: RefObject<LocalParticipantInfo | null>,
): void => {
  if (!localParticipantRef?.current) return;

  const isMic = deviceType === DeviceType.MIC;
  const stream = isMic
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
  mediaType: string
) => {
  const mediaConstraints = {
    video: {
      deviceId: mediaType === DeviceType.CAMERA && deviceId ? { exact: deviceId } : null,
    },
    audio: {
      deviceId: mediaType === DeviceType.MIC && deviceId ? { exact: deviceId } : null,
    },
  } as MediaStreamConstraints;

  return navigator.mediaDevices.getUserMedia(mediaConstraints);
};

interface Strategy extends StageStrategy {
  audioTrack?: LocalStageStream;
  videoTrack?: LocalStageStream;
  updateTracks: (audio: LocalStageStream, video: LocalStageStream) => void;
  stageStreamsToPublish: () => LocalStageStream[];
  shouldPublishParticipant: (participant: StageParticipantInfo) => boolean;
  shouldSubscribeToParticipant: (participant: StageParticipantInfo) => SubscribeType;
};

export const createLocalStageStream = async (
  deviceId: string | null,
  deviceType: DeviceType
): Promise<LocalStageStream | undefined> => {
  
  if (!deviceId) return;

  const mediaStream: MediaStream = await getMediaForDevices(deviceId, deviceType);

  const stageStream =
    deviceType === DeviceType.CAMERA
      ? new LocalStageStream(mediaStream.getVideoTracks()[0])
      : new LocalStageStream(mediaStream.getAudioTracks()[0]);

  return stageStream;
};

export const setupStrategy = (): Strategy => {

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
  strategyRef: React.RefObject<StageStrategy | null>,
  stageRef: React.RefObject<Stage | null>,
  localParticipantRef: React.RefObject<LocalParticipantInfo | null>
) => {

  const videoStream = await createLocalStageStream(camId, DeviceType.CAMERA);
  const audioStream = await createLocalStageStream(micId, DeviceType.MIC);
  if (!videoStream || !audioStream) return;

  const strategy = setupStrategy();
  strategy.updateTracks(audioStream, videoStream);
  strategyRef.current = strategy;
  localParticipantRef.current = {
    audioStream: audioStream,
    videoStream: videoStream
  }

  let stage: Stage | null = new Stage(participantToken, strategyRef.current);

  stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state: string) => {
    setIsConnected(state === ConnectionState.CONNECTED);
    audioStream.setMuted(true);
    setIsMicMuted(true);
  });

  stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant: StageParticipantInfo, streams: StageStream[]) => {
    if (participant.isLocal) {
      setLocalParticipant({ participant, streams });
    } else {
        setParticipants((prev) => {
            const exists = prev.some((p) => p.participant.id === participant.id);
            return exists ? prev : [...prev, { participant, streams }];
          });
    }
  });

  stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (participant: StageParticipantInfo) => {
    setParticipants((prev) =>
      prev.filter(({ participant: current }) => current.id !== participant.id)
    );
  });

  try {
    await stage.join();
  } catch (err) {
    console.error("Failed to join stage:", err);
    stage = null;
  }

  stageRef.current = stage;
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


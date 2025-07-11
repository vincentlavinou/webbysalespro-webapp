'use client';

import { RefObject } from "react";
import { DeviceType } from "../enum";
import { WebiSalesProParticipant } from "@/broadcast/context";

// ✅ Type-only imports to fix SSR issues
type Stage = import("amazon-ivs-web-broadcast").Stage;
type StageParticipantInfo = import("amazon-ivs-web-broadcast").StageParticipantInfo;
type StageStrategy = import("amazon-ivs-web-broadcast").StageStrategy;
type StageStream = import("amazon-ivs-web-broadcast").StageStream;
type LocalStageStream = import("amazon-ivs-web-broadcast").LocalStageStream;

export const getDevices = async () => {
  await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  const devices = await navigator.mediaDevices.enumerateDevices();

  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  const audioDevices = devices.filter((d) => d.kind === "audioinput");

  return { videoDevices, audioDevices };
};

export const getMediaForDevices = async (
  mediaType: DeviceType,
  deviceId: string,
): Promise<MediaStream | null> => {

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
  mainPresenter?: WebiSalesProParticipant
  updateTracks: (audio: LocalStageStream, video: LocalStageStream) => void
  setMainPresenter: (presenter: WebiSalesProParticipant) => void
}

export const createLocalStageStream = async (
  deviceId: string | undefined,
  deviceType: DeviceType
): Promise<LocalStageStream | undefined> => {

  if(deviceId === undefined) return

  const mediaStream = await getMediaForDevices(deviceType, deviceId);
  const track =
    deviceType === DeviceType.CAMERA
      ? mediaStream?.getVideoTracks()[0]
      : deviceType === DeviceType.MIC
      ? mediaStream?.getAudioTracks()[0]
      : mediaStream?.getVideoTracks()[0]; // SCREEN uses video

  if(track === undefined) return undefined
  const { LocalStageStream } = await import("amazon-ivs-web-broadcast");
  return new LocalStageStream(track);
};

export const setupStrategy = async (
  role: 'host' | 'presenter' | 'attendee' | undefined
): Promise<Strategy> => {
  const { SubscribeType } = await import("amazon-ivs-web-broadcast");

  const strategy: Strategy = {
    audioTrack: undefined,
    videoTrack: undefined,
    mainPresenter: undefined,

    updateTracks(audio, video) {
      this.audioTrack = audio;
      this.videoTrack = video;
    },

    setMainPresenter(presenter) {
      this.mainPresenter = presenter
    },

    stageStreamsToPublish() {
      // Host and Presenter can publish
      return role === "host" || role === "presenter"
        ? [this.audioTrack!, this.videoTrack!]
        : [];
    },

    shouldPublishParticipant() {
      return role === "host" || role === "presenter";
    },

    shouldSubscribeToParticipant(participant) {
      const participantRole = participant.attributes?.role;
      const isPresenter = participantRole === "host" || participantRole === "presenter";
       // 🧑‍💼 Attendee logic
      if (role === "attendee") {
        const main = this.mainPresenter?.participant;

        // ✅ Fallback to host if no main presenter is assigned
        if (!main && participant.userId.includes('host')) {
          return SubscribeType.AUDIO_VIDEO
        }

        return participant.userId === main?.userId
          ? SubscribeType.AUDIO_VIDEO
          : SubscribeType.NONE;
      }

      // Host/presenters can see all presenters (but not attendees)
      return isPresenter ? SubscribeType.AUDIO_VIDEO : SubscribeType.NONE;
    }
  };
  return strategy;
};

export const joinStage = async (
  isInit: boolean,
  participantToken: string,
  setIsConnected: (connected: boolean) => void,
  setParticipants: React.Dispatch<React.SetStateAction<{ participant: StageParticipantInfo; streams: StageStream[] }[]>>,
  stageRef: RefObject<Stage | undefined>,
  localParticipantRef: RefObject<StageParticipantInfo | undefined>,
  strategy: StageStrategy | undefined
): Promise<void> => {

  if (!isInit || !strategy) return;


  const { Stage, StageEvents, ConnectionState } = await import("amazon-ivs-web-broadcast");
  const stage = new Stage(participantToken, strategy);

  stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state: string) => {
    setIsConnected(state === ConnectionState.CONNECTED);
  });

  stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, streams) => {
    if(participant.isLocal) {
      localParticipantRef.current = participant
    }
    setParticipants((prev) => {
      const existing = prev.find((p) => p.participant.id === participant.id);
  
      // 👇 Update if new or if streams are different
      if (!existing) {
        return [...prev, { participant, streams }];
      }
  
      const oldTrackIds = existing.streams.map(s => s.mediaStreamTrack.id).sort();
      const newTrackIds = streams.map(s => s.mediaStreamTrack.id).sort();
  
      const isSame = oldTrackIds.join(',') === newTrackIds.join(',');
      if (isSame) {
        return prev; // no change
      }
  
      // 👇 Replace the existing participant with updated streams
      return prev.map(p =>
        p.participant.id === participant.id
          ? { participant, streams }
          : p
      );
    });
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
    stageRef.current = undefined;
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

export const createCompositeVideoTrack = async ({deviceId}:{deviceId?: string}): Promise<{
  track: MediaStreamTrack;
  cleanup: () => void;
} | null> => {

  let screenStream: MediaStream
  try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  } catch {
    return null
  }
  
  const cameraStream = await navigator.mediaDevices.getUserMedia(
    { video: deviceId !== undefined ? { 
        deviceId: { 
          exact: deviceId 
        }  
      } : true
    }
  );

  const screenTrack = screenStream.getVideoTracks()[0];
  const cameraTrack = cameraStream.getVideoTracks()[0];

  const screenVideo = document.createElement("video");
  const cameraVideo = document.createElement("video");

  screenVideo.srcObject = new MediaStream([screenTrack]);
  cameraVideo.srcObject = new MediaStream([cameraTrack]);

  screenVideo.muted = true;
  cameraVideo.muted = true;
  await screenVideo.play();
  await cameraVideo.play();

  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const draw = () => {
    if (screenVideo.readyState >= 2) {
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
    }

    if (cameraVideo.readyState >= 2) {
      const pipHeight = 160;
      const aspect = cameraVideo.videoWidth / cameraVideo.videoHeight || 4 / 3;
      const pipWidth = pipHeight * aspect;
      ctx.drawImage(
        cameraVideo,
        canvas.width - pipWidth - 20,
        canvas.height - pipHeight - 20,
        pipWidth,
        pipHeight
      );
    }

    requestAnimationFrame(draw);
  };

  draw();

  const canvasStream = canvas.captureStream(30);
  const compositeTrack = canvasStream.getVideoTracks()[0];

  // Return track and cleanup callback
  const cleanup = () => {
    compositeTrack.stop();
    screenTrack.stop(); // 👈 force browser to exit screen share
    cameraTrack.stop();
  };

  return { track: compositeTrack, cleanup };
};


export function equalsWebiSalesProParticipant(
  a?: WebiSalesProParticipant,
  b?: WebiSalesProParticipant
): boolean {
  if (!a || !b) return false;

  if (a.participant.id !== b.participant.id) return false;

  const trackIds = (streams: StageStream[]) =>
    streams.map(s => s.mediaStreamTrack.id).sort().join(",");

  return trackIds(a.streams) === trackIds(b.streams);
}
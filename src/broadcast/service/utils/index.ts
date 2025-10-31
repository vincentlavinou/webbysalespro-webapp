'use client';

import { RefObject } from "react";
import { DeviceType } from "../enum";
import { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import { LocalStreamEvent, Media, WebinarVideoInjection } from "../type";

// ✅ Type-only imports to fix SSR issues
type Stage = import("amazon-ivs-web-broadcast").Stage;
type StageParticipantInfo = import("amazon-ivs-web-broadcast").StageParticipantInfo;
type StageStrategy = import("amazon-ivs-web-broadcast").StageStrategy;
type StageStream = import("amazon-ivs-web-broadcast").StageStream;
type SeiMessage = import("amazon-ivs-web-broadcast").SeiMessage;
type StageVideoConfiguration = import("amazon-ivs-web-broadcast").StageVideoConfiguration;

export function getPlaybackUrl(v: WebinarVideoInjection): string | undefined {

    return v.playbackUrl || v.originalUrl || v.fileUrl || undefined
}


export const getDevices = async () => {
  const streams = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  const devices = await navigator.mediaDevices.enumerateDevices();

  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  const audioDevices = devices.filter((d) => d.kind === "audioinput");

  return { videoDevices, audioDevices, mediaStreams: streams };
};

export const getMediaForDevices = async (
  mediaType: DeviceType,
  deviceId: string,
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

export const createLocalStageStream = async (
  deviceId: string | undefined,
  deviceType: DeviceType
): Promise<Media | undefined> => {

  let currentDeviceId: string | undefined = deviceId
  console.log(`Device Id: ${deviceId}`)
  if (currentDeviceId === undefined) {
    const { videoDevices, audioDevices } = await getDevices()
    currentDeviceId = deviceType === DeviceType.CAMERA ? videoDevices[0]?.deviceId : deviceType === DeviceType.MIC ? audioDevices[0]?.deviceId : undefined
  }

  if (!currentDeviceId) return

  console.log(`Device Type: ${deviceType} - Id: ${currentDeviceId}`)

  const mediaStream = await getMediaForDevices(deviceType, currentDeviceId);
  const track =
    deviceType === DeviceType.CAMERA
      ? mediaStream?.getVideoTracks()[0]
      : deviceType === DeviceType.MIC
        ? mediaStream?.getAudioTracks()[0]
        : mediaStream?.getVideoTracks()[0]; // SCREEN uses video

  if (track === undefined) return undefined

  const config: StageVideoConfiguration | undefined = deviceType === DeviceType.CAMERA ? {
    inBandMessaging: {
      enabled: true
    }
  } : undefined

  const { LocalStageStream } = await import("amazon-ivs-web-broadcast");

  const clean = () => {
    console.log(`Device: ${deviceType} - Cleaning up`)
    track.stop()
  }
  return {
    stageStream: new LocalStageStream(track, config),
    track,
    deviceId: deviceId,
    cleanup: clean
  }
};

export const joinStage = async (
  isInit: boolean,
  participantToken: string,
  setIsConnected: (connected: boolean) => void,
  setParticipants: React.Dispatch<React.SetStateAction<{ participant: StageParticipantInfo; streams: StageStream[] }[]>>,
  stageRef: RefObject<Stage | undefined>,
  localParticipantRef: RefObject<StageParticipantInfo | undefined>,
  strategy: StageStrategy | undefined,
  onStreamEvent: (event: LocalStreamEvent) => void
): Promise<void> => {
  if (!isInit || !strategy) return;

  const { Stage, StageEvents, ConnectionState } = await import("amazon-ivs-web-broadcast");
  const stage = new Stage(participantToken, strategy);
  const processedMessages: Record<string, LocalStreamEvent> = {}

  // Connection state tracking
  stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state: string) => {
    setIsConnected(state === ConnectionState.CONNECTED);
  });

  stage.on(StageEvents.STAGE_STREAM_SEI_MESSAGE_RECEIVED, (participant: StageParticipantInfo, seiMessage: SeiMessage) => {
    const eventPayloadString = new TextDecoder().decode(seiMessage.payload);
    const message = JSON.parse(eventPayloadString) as LocalStreamEvent
    if (processedMessages[message.id] === undefined) {
      processedMessages[message.id] = message
      onStreamEvent(message)
    }

  });

  // Handle new or updated streams
  stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, streams) => {
    if (participant.isLocal) {
      localParticipantRef.current = participant;
    }

    setParticipants((prev) => {
      const existing = prev.find((p) => p.participant.id === participant.id);

      console.log("existing", existing)
      if (!existing) {
        return [...prev, { participant, streams }];
      }

      const oldTrackIds = existing.streams.map(s => s.mediaStreamTrack.id).sort();
      const newTrackIds = streams.map(s => s.mediaStreamTrack.id).sort();
      const isSame = oldTrackIds.join(',') === newTrackIds.join(',');

      console.log("is same", isSame)

      if (isSame) {
        return prev; // No change needed
      }

      console.log("update participant", participant.userId)
      return prev.map(p =>
        p.participant.id === participant.id
          ? { participant, streams }
          : p
      );
    });
  });

  // Handle removed streams
  stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_REMOVED, (participant, removedStreams) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.participant.id === participant.id
          ? {
            participant,
            streams: p.streams.filter(
              (s) => !removedStreams.find((r) => r.mediaStreamTrack.id === s.mediaStreamTrack.id)
            ),
          }
          : p
      )
    );
  });

  stage.on(StageEvents.STAGE_STREAM_MUTE_CHANGED, (participant, updatedStream) => {
    setParticipants(prev => prev.map(previous => previous.participant.id === participant.id ? {
      participant: participant,
      streams: previous.streams.map(stream => stream.id === updatedStream.id ? updatedStream : stream)
    } : previous));
  });

  // Handle participant leave
  stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (participant) => {
    setParticipants((prev) =>
      prev.filter(({ participant: p }) => p.id !== participant.id)
    );
  });

  // Join the stage
  try {
    console.log("joinning stream...")
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
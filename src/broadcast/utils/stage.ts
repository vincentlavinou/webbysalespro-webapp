import { Stage, StageParticipantInfo } from 'amazon-ivs-web-broadcast';
import { getMediaForDevices, CAMERA, MIC } from './mediadevices';

declare const IVSBroadcastClient: any; // Replace with actual types if available

type StageStream = InstanceType<typeof IVSBroadcastClient.LocalStageStream>;
type Strategy = {
  audioTrack?: StageStream;
  videoTrack?: StageStream;
  updateTracks: (audio: StageStream, video: StageStream) => void;
  stageStreamsToPublish: () => StageStream[];
  shouldPublishParticipant: (participant: any) => boolean;
  shouldSubscribeToParticipant: (participant: any) => any;
};

export const createLocalStageStream = async (
  deviceId: string | null,
  deviceType: typeof CAMERA | typeof MIC
): Promise<InstanceType<typeof IVSBroadcastClient.LocalStageStream> | undefined> => {
  const { LocalStageStream } = IVSBroadcastClient;

  if (!deviceId) {
    console.warn('Attempted to set local media with a null device ID');
    return;
  }

  const newDevice: MediaStream = await getMediaForDevices(deviceId, deviceType);

  const stageStream =
    deviceType === CAMERA
      ? new LocalStageStream(newDevice.getVideoTracks()[0])
      : new LocalStageStream(newDevice.getAudioTracks()[0]);

  return stageStream;
};

export const setupStrategy = (isInitializeComplete: boolean): Strategy | undefined => {
  if (!isInitializeComplete) return;

  const { SubscribeType } = IVSBroadcastClient;

  const strategy: Strategy = {
    audioTrack: undefined,
    videoTrack: undefined,

    updateTracks(newAudioTrack, newVideoTrack) {
      this.audioTrack = newAudioTrack;
      this.videoTrack = newVideoTrack;
    },

    stageStreamsToPublish() {
      return [this.audioTrack!, this.videoTrack!];
    },

    shouldPublishParticipant(_participant) {
      return true;
    },

    shouldSubscribeToParticipant(_participant) {
      return SubscribeType.AUDIO_VIDEO;
    },
  };

  return strategy;
};

export const joinStage = async (
  isInitializeComplete: boolean,
  participantToken: string,
  selectedAudioDeviceId: string | null,
  selectedVideoDeviceId: string | null,
  setIsConnected: (state: boolean) => void,
  setIsMicMuted: (muted: boolean) => void,
  setLocalParticipant: (p: {participant: StageParticipantInfo, streams: StageStream[]}) => void,
  setParticipants: React.Dispatch<React.SetStateAction<{participant: StageParticipantInfo, streams: StageStream[]}[]>>,
  strategyRef: React.RefObject<Strategy>,
  stageRef: React.RefObject<Stage>
): Promise<void> => {
  const { Stage, StageEvents, ConnectionState } = IVSBroadcastClient;

  if (!isInitializeComplete) return;

  const cameraStageStream = await createLocalStageStream(selectedVideoDeviceId, CAMERA);
  const micStageStream = await createLocalStageStream(selectedAudioDeviceId, MIC);

  if (!cameraStageStream || !micStageStream) return;

  const strategy = setupStrategy(isInitializeComplete);
  if (!strategy) return;

  strategy.updateTracks(micStageStream, cameraStageStream);
  strategyRef.current = strategy;

  let stage = new Stage(participantToken, strategyRef.current);

  stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state: string) => {
    setIsConnected(state === ConnectionState.CONNECTED);
    micStageStream.setMuted(true);
    setIsMicMuted(true);
  });

  stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant: StageParticipantInfo, streams: StageStream[]) => {
    console.log('Participant Media Added: ', participant, streams);

    if (participant.isLocal) {
      setLocalParticipant({ participant, streams });
    }

    setParticipants((prev) => {
      const exists = prev.some((p) => p.participant.id === participant.id);
      return exists ? prev : [...prev, { participant, streams }];
    });
  });

  stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (participant: any) => {
    console.log('Participant Left: ', participant);
    setParticipants((prev) =>
      prev.filter(({ participant: current }) => current.id !== participant.id)
    );
  });

  try {
    await stage.join();
  } catch (err) {
    console.error('Failed to join stage:', err);
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

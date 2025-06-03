// types.ts (recommended to separate these into a shared types file)
import { MutableRefObject, RefObject } from 'react';
import { ChannelType, Orientation, Resolution } from './enums'; // adjust the import path if needed

export interface StreamConfigInput {
  width: number;
  height: number;
  bitrate: number;
}

export interface StreamConfig {
  maxResolution: {
    width: number;
    height: number;
  };
  maxBitrate: number;
  maxFramerate: number;
}

export interface SavedDevices {
    savedAudioDeviceId?: string;
    savedVideoDeviceId?: string;
}

export interface GetCameraStreamParams {
    deviceId?: string;
    width?: number;
    height?: number;
    facingMode?: string;
    frameRate?: number;
    aspectRatio?: number;
}


export interface MediaSettings {
  savedAudioDeviceId: string | undefined;
  setSavedAudioDeviceId: (value: string | undefined) => void;
  savedVideoDeviceId: string | undefined;
  setSavedVideoDeviceId: (value: string | undefined) => void;
  channelType: ChannelType;
  setChannelType: (value: ChannelType) => void;
  resolution: Resolution;
  setResolution: (value: Resolution) => void;
  orientation: Orientation;
  setOrientation: (value: Orientation) => void;
  configRef?: MutableRefObject<StreamConfig>; // Replace `any` with a specific type if known
  clearMediaSavedValues: () => void;
}

import { MutableRefObject } from 'react';

export interface LocalMedia {
  permissions: boolean;
  localVideoMounted: boolean;
  localAudioMounted: boolean;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  localAudioStreamRef: RefObject<MediaStream | undefined | null>;
  localVideoStreamRef: RefObject<MediaStream | undefined | null>;
  localAudioDeviceId: string | undefined;
  localVideoDeviceId: string | undefined;
  videoElemRef: RefObject<HTMLVideoElement | null>;
  canvasElemRef: RefObject<HTMLCanvasElement | null>;
  refreshSceneRef: RefObject<Function | null>;
  localScreenShareStreamRef: RefObject<MediaStream | null>;
  enableCanvasCamera: boolean;
  setEnableCanvasCamera: (value: boolean) => void;
  updateLocalAudio: (
    deviceId: string,
    _audioDevices?: MediaDeviceInfo[]
  ) => Promise<MediaStream | undefined>;
  updateLocalVideo: (
    deviceId: string,
    _videoDevices?: MediaDeviceInfo[]
  ) => Promise<MediaStream | undefined>;
  setInitialDevices: () => Promise<{
    audioDeviceId?: string;
    audioStream?: MediaStream;
    videoDeviceId?: string;
    videoStream?: MediaStream;
  }>;
  cleanUpDevices: () => void;
  refreshDevices: (e?: Event) => Promise<{
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
    permissions: boolean;
  }>;
  setAudioDevices: React.Dispatch<React.SetStateAction<MediaDeviceInfo[]>>;
  setVideoDevices: React.Dispatch<React.SetStateAction<MediaDeviceInfo[]>>;
  startScreenShare: () => Promise<MediaStream | undefined>;
  stopScreenShare: () => void;
}

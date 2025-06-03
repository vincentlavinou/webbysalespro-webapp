'use client';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { isMobileOnly } from 'react-device-detect';
import useLocalStorage from '@/storage/hooks/useLocalStorage';
import { 
    StreamConfigInput, 
    StreamConfig, 
    SavedDevices,
    GetCameraStreamParams
} from '../model/type';
import { ChannelType, Orientation, Resolution } from '../model/enum';



let permissions: Permissions | undefined;
let mediaDevices: MediaDevices | undefined;

if (typeof window !== 'undefined') {
  permissions = navigator.permissions;
  mediaDevices = navigator.mediaDevices;
}

function checkMediaDevicesSupport(): void {
  if (!mediaDevices) {
    throw new Error(
      'Media device permissions can only be requested in a secure context (i.e. HTTPS).'
    );
  }
}


function isFulfilled<T>(input: PromiseSettledResult<T>): input is PromiseFulfilledResult<T> {
    return input.status === 'fulfilled';
}

function isRejected<T>(input: PromiseSettledResult<T>): input is PromiseRejectedResult {
    return input.status === 'rejected';
}

  async function enumerateDevices(): Promise<{
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
  }> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === 'videoinput');
    if (!videoDevices.length) {
      toast.error('Error: Could not find any webcams.', {
        id: 'err-could-not-list-video-devices',
        duration: Infinity,
      });
    }
  
    const audioDevices = devices.filter((d) => d.kind === 'audioinput');
    if (!audioDevices.length) {
      toast.error('Error: Could not find any microphones.', {
        id: 'err-could-not-list-audio-devices',
        duration: Infinity,
      });
    }
  
    return {
      videoDevices,
      audioDevices,
    };
  }

async function getPermissions({ savedAudioDeviceId, savedVideoDeviceId }: SavedDevices): Promise<{
    permissions: boolean;
    mediaStream?: MediaStream;
    error?: Error;
}> {
    let error: Error | undefined;
    let mediaStream: MediaStream | undefined;
    let arePermissionsGranted = false;

    try {
        checkMediaDevicesSupport();

        const [cameraPermissionQueryResult, microphonePermissionQueryResult] =
        await Promise.allSettled(
            ['camera', 'microphone'].map((permissionDescriptorName) =>
            permissions!.query({
                name: permissionDescriptorName as PermissionName,
            })
            )
        );

        const constraints: MediaStreamConstraints = {};

        if (
        (isFulfilled(cameraPermissionQueryResult) &&
            cameraPermissionQueryResult.value.state !== 'granted') ||
        isRejected(cameraPermissionQueryResult)
        ) {
        constraints.video = {
            deviceId: savedVideoDeviceId ? { ideal: savedVideoDeviceId } : undefined,
        };
        }

        if (
        (isFulfilled(microphonePermissionQueryResult) &&
            microphonePermissionQueryResult.value.state !== 'granted') ||
        isRejected(microphonePermissionQueryResult)
        ) {
        constraints.audio = {
            deviceId: savedAudioDeviceId ? { ideal: savedAudioDeviceId } : undefined,
        };
        }

        if (Object.keys(constraints).length) {
        mediaStream = await mediaDevices!.getUserMedia(constraints);
        }

        arePermissionsGranted = true;
    } catch (err: any) {
        error = new Error(err.name);
    }

    return { permissions: arePermissionsGranted, mediaStream, error };
}

async function getAvailableDevices({
    savedAudioDeviceId,
    savedVideoDeviceId,
}: SavedDevices): Promise<{
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
    permissions: boolean;
    }> {
    const { permissions, mediaStream, error } = await getPermissions({
        savedAudioDeviceId,
        savedVideoDeviceId,
    });

    if (!permissions || error) {
        toast.error(
        'Error: Could not access webcams or microphones. Allow this app to access your webcams and microphones and refresh the app.',
        {
            id: 'err-permission-denied',
            duration: Infinity,
        }
        );
    }

    const { videoDevices, audioDevices } = await enumerateDevices();

    if (mediaStream) await stopMediaStream(mediaStream);

    return {
        videoDevices,
        audioDevices,
        permissions,
    };
}

async function stopMediaStream(mediaStream: MediaStream): Promise<void> {
    for (const track of mediaStream.getTracks()) {
        track.stop();
    }
}

async function getCameraStream({
    deviceId,
    width,
    height,
    facingMode,
    frameRate,
    aspectRatio,
}: GetCameraStreamParams): Promise<MediaStream | undefined> {
    let cameraStream: MediaStream | undefined;
    const constraints: MediaStreamConstraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: width ? { ideal: width } : undefined,
            height: height ? { ideal: height } : undefined,
            facingMode: facingMode ? { ideal: facingMode } : undefined,
            frameRate: frameRate ? { ideal: frameRate } : undefined,
            aspectRatio: aspectRatio ? { ideal: aspectRatio } : undefined,
        },
        audio: false,
    };
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: any) {
        console.error('Could not get camera stream:', err.message);
    }
    return cameraStream;
}

async function getMicrophoneStream(deviceId: string = 'default'): Promise<MediaStream | undefined> {
    let microphoneTrack: MediaStream | undefined;
    try {
        microphoneTrack = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { deviceId: { exact: deviceId } },
        });
    } catch (err: any) {
        console.error('Could not get microphone stream:', err.message);
    }
    return microphoneTrack;
}

async function getScreenshareStream(): Promise<MediaStream> {
    try {
        return await navigator.mediaDevices.getDisplayMedia({
        video: {
            // cursor: 'always',
            frameRate: 30,
            // resizeMode: 'crop-and-scale',
        },
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
        },
        });
    } catch (err: any) {
        throw new Error(err);
    }
}

function getIdealDevice(deviceId: string | undefined, devices: MediaDeviceInfo[]): string | undefined {
    if (!devices || devices.length === 0) return undefined;
    const deviceExists = devices.some((device) => device.deviceId === deviceId);
    return deviceExists ? deviceId : devices[0].deviceId;
}
  
function getDisconnectedDevices(
    oldDeviceArr: MediaDeviceInfo[],
    newDeviceArr: MediaDeviceInfo[]
): MediaDeviceInfo[] {
    return oldDeviceArr.filter(
        (oldDevice) =>
            newDeviceArr.findIndex((newDevice) => newDevice.deviceId === oldDevice.deviceId) === -1
        );
}
  
function getConnectedDevices(
    oldDeviceArr: MediaDeviceInfo[],
    newDeviceArr: MediaDeviceInfo[]
): MediaDeviceInfo[] {
    return newDeviceArr.filter(
    (newDevice) =>
        oldDeviceArr.findIndex((oldDevice) => oldDevice.deviceId === newDevice.deviceId) === -1
    );
}

function clearMediaSavedValues() {
    localStorage.removeItem('savedAudioDeviceId');
    localStorage.removeItem('savedVideoDeviceId');
}

function getMediaSavedValues() {

    const [saveSettings] = useLocalStorage(
        'rememberSettings',
        false,
        false
    );

    const [channelType, setChannelType] = useLocalStorage(
        'channelType',
        ChannelType.BASIC,
        saveSettings
      );

    const [savedAudioDeviceId, setSavedAudioDeviceId] = useLocalStorage<string | undefined>(
        'savedAudioDeviceId',
        undefined,
        saveSettings
    );

    const [savedVideoDeviceId, setSavedVideoDeviceId] = useLocalStorage<string | undefined>(
        'savedVideoDeviceId',
        undefined,
        saveSettings
    );

    const [resolution, setResolution] = useLocalStorage(
        'streamResolution',
        Resolution.R720,
        saveSettings
      );

    const [orientation, setOrientation] = useLocalStorage(
        'orientation',
        isMobileOnly ? Orientation.PORTRAIT : Orientation.LANDSCAPE,
        saveSettings
    );

    const configRef = useRef(
        getConfigFromResolution(resolution, channelType, orientation)
      );
    
      useEffect(() => {
        configRef.current = getConfigFromResolution(
          resolution,
          channelType,
          orientation
        );
      }, [resolution, channelType]);

    return {
        savedAudioDeviceId,
        setSavedAudioDeviceId,
        savedVideoDeviceId,
        setSavedVideoDeviceId,
        channelType,
        setChannelType,
        resolution,
        setResolution,
        orientation,
        setOrientation,
        configRef,
    };
}

export function formatConfig({ width, height, bitrate: maxBitrate }: StreamConfigInput): StreamConfig {
    const maxFramerate = 30;
    return {
        maxResolution: { width, height },
        maxBitrate,
        maxFramerate,
    };
}
  
export function getConfigFromResolution(
    resolution: Resolution,
    channelType: ChannelType,
    orientation: Orientation
): StreamConfig {
    const isLandscape = orientation === 'LANDSCAPE';
    let config: StreamConfigInput;

    switch (resolution) {
    case Resolution.R1080:
        config = {
        width: isLandscape ? 1920 : 1080,
        height: isLandscape ? 1080 : 1920,
        bitrate: channelType === 'BASIC' ? 3500 : 8500,
        };
        break;
    case Resolution.R720:
        config = {
        width: isLandscape ? 1280 : 720,
        height: isLandscape ? 720 : 1280,
        bitrate: channelType === 'BASIC' ? 3500 : 6500,
        };
        break;
    case Resolution.R480:
        config = {
        width: isLandscape ? 853 : 480,
        height: isLandscape ? 480 : 853,
        bitrate: channelType === 'BASIC' ? 1500 : 3500,
        };
        break;
    case Resolution.R360:
        config = {
        width: isLandscape ? 640 : 360,
        height: isLandscape ? 360 : 640,
        bitrate: channelType === 'BASIC' ? 1500 : 3500,
        };
        break;
    default:
        config = {
        width: isLandscape ? 1280 : 720,
        height: isLandscape ? 720 : 1280,
        bitrate: channelType === 'BASIC' ? 3500 : 6500,
        };
        break;
    }

    return formatConfig(config);
}


export {
    getAvailableDevices,
    getCameraStream,
    getMicrophoneStream,
    getScreenshareStream,
    stopMediaStream,
    getIdealDevice,
    getDisconnectedDevices,
    getConnectedDevices,
    clearMediaSavedValues,
    getMediaSavedValues,
  };
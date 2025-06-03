
import { LocalStageStream } from "amazon-ivs-web-broadcast";
import { RefObject } from "react";

export const CAMERA = "camera";
export const MIC = "mic";

/**
 * Returns all devices available on the current device
 */
export const getDevices = async () => {
  // Prevents issues on Safari/FF so devices are not blank
  await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  const devices = await navigator.mediaDevices.enumerateDevices();

  // Get all video devices
  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  if (!videoDevices.length) {
    console.error("No video devices found.");
  }

  // Get all audio devices
  const audioDevices = devices.filter((d) => d.kind === "audioinput");
  if (!audioDevices.length) {
    console.error("No audio devices found.");
  }

  return { videoDevices, audioDevices };
};

/**
 * Gets the media stream for the specified device ID and type.
 * @param {string} deviceId - The device ID.
 * @param {string} mediaType - The type of media ('video' or 'audio').
 * @returns {Promise<MediaStream>} - The resulting media stream.
 */
export const getMediaForDevices = async (deviceId: string, mediaType: string) => {
    const mediaConstraints = {
      video: {
        deviceId: mediaType === CAMERA && deviceId ? { exact: deviceId } : null,
      },
      audio: {
        deviceId: mediaType === MIC && deviceId ? { exact: deviceId } : null,
      },
    } as MediaStreamConstraints;
  
    return navigator.mediaDevices.getUserMedia(mediaConstraints);
  };


  
  
  type DeviceType = typeof MIC | typeof CAMERA;
  
  interface StageRef {
    current: {
      localParticipant: {
        audioStream: LocalStageStream;
        videoStream: LocalStageStream;
      };
    } | null;
  }
  
  /**
   * Toggles the mute status of the camera or microphone in the IVS stage.
   */
  export const handleMediaToggle = (
    deviceType: DeviceType,
    stageRef: RefObject<StageRef["current"]>,
    setIsDeviceStopped: (state: boolean) => void
  ): void => {
    if (!stageRef.current) return;
  
    if (deviceType === CAMERA) {
      const { videoStream } = stageRef.current.localParticipant;
      const isHidden = videoStream.isMuted;
      videoStream.setMuted(!isHidden);
      setIsDeviceStopped(!isHidden);
    } else if (deviceType === MIC) {
      const { audioStream } = stageRef.current.localParticipant;
      const isMuted = audioStream.isMuted;
      audioStream.setMuted(!isMuted);
      setIsDeviceStopped(!isMuted);
    }
  };
  
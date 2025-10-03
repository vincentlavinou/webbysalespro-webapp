import React, { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { LocalMediaContext } from "../context/LocalMediaContext";
import { createCompositeVideoTrack, createLocalStageStream } from "../service/utils";
import { DeviceType, LocalStorage } from "../service/enum";
import { useLocalMediaDevices } from "../hooks";
import { useMediaStrategy } from "../hooks/use-media-strategy";
import { Media } from "../service/type";

type Stage = import("amazon-ivs-web-broadcast").Stage;

interface RefreshMediaOption {
  cleanupVideo?: boolean,
  cleanupAudio?: boolean
}

interface LocalMediaProviderProps {
  stageRef: RefObject<Stage | undefined>
  children: React.ReactNode
}

export function LocalMediaProvider({ children, stageRef }: LocalMediaProviderProps) {

  const { strategy } = useMediaStrategy()
  const [videoStream, setVideoStream] = useState<Media | undefined>(undefined);
  const [audioStream, setAudioStream] = useState<Media | undefined>(undefined);
  const { selectedVideoId, selectedAudioId, setAudioMuted, setVideoMuted, saveSelectedMedia } = useLocalMediaDevices();
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const videoCleanUpRef = useRef<(() => void) | undefined>(undefined);
  const audioCleanUpRef = useRef<(() => void) | undefined>(undefined);

  const stopTracks = useCallback(() => {
    videoCleanUpRef.current?.();
    videoCleanUpRef.current = undefined;

    audioCleanUpRef.current?.();
    audioCleanUpRef.current = undefined;

    setIsScreenSharing(false);
  }, [videoStream, audioStream, setIsScreenSharing]);

  const startVideoStageStream = useCallback(async () => {
    const stream = await createLocalStageStream(selectedVideoId, DeviceType.CAMERA)
    setVideoStream(stream);
    setVideoMuted(stream?.stageStream.isMuted === true);
    saveSelectedMedia(selectedVideoId, LocalStorage.VIDEO_ID);
    return stream
  }, [selectedVideoId])

  const startScreenShareStream = useCallback(async () => {
    const stream = await createCompositeVideoTrack({
      deviceId: selectedVideoId
    });
    setVideoStream(stream);
    setVideoMuted(stream?.stageStream.isMuted === true);
    saveSelectedMedia(selectedVideoId, LocalStorage.VIDEO_ID);
    return stream
  }, [selectedVideoId])

  const startAudioStageStream = useCallback(async () => {
    const stream = await createLocalStageStream(selectedAudioId, DeviceType.MIC)
    setAudioStream(stream);
    setAudioMuted(stream?.stageStream.isMuted === true);
    saveSelectedMedia(selectedAudioId, LocalStorage.AUDIO_ID);
    return stream
  }, [selectedAudioId])

  const refreshVideoAndAudioStreamIfDefined = useCallback((video: Media | undefined, audio: Media | undefined, options?: RefreshMediaOption) => {
    if (!video) {
      console.log("unable to refresh, no video")
      return
    }
    if (!audio) {
      console.log("unable to refresh, no audio")
      return
    }

    if(options?.cleanupVideo) {
      videoCleanUpRef.current?.()
      videoCleanUpRef.current = video.cleanup;
    }
    
    if(options?.cleanupAudio) {
      audioCleanUpRef.current?.()
      audioCleanUpRef.current = audio.cleanup
    }
    

    strategy.updateTracks(video.stageStream, audio.stageStream);
    stageRef.current?.refreshStrategy();
  },[stageRef, strategy])

  const createMedia = useCallback(async () => {

    const videoStageStream = await startVideoStageStream()
    const audioStageStream = await startAudioStageStream()

    refreshVideoAndAudioStreamIfDefined(videoStageStream, audioStageStream, {
      cleanupVideo: true,
      cleanupAudio: true
    })
  }, [stageRef, strategy, startVideoStageStream, startAudioStageStream, refreshVideoAndAudioStreamIfDefined]);

  useEffect(() => {
    const refreshVideoStream = async () => {
      if (selectedVideoId != videoStream?.deviceId) {
        // TODO - update to support screen share. Create a screen share Provider, be able to grab the screen share and update the camera
        const videoStageStream = await startVideoStageStream()
        refreshVideoAndAudioStreamIfDefined(videoStageStream, audioStream,{
          cleanupVideo: true
        })
      }
    }

    refreshVideoStream()
  }, [selectedVideoId, startVideoStageStream, refreshVideoAndAudioStreamIfDefined])

  useEffect(() => {
    const refreshAudioStream = async () => {
      if (selectedAudioId != audioStream?.deviceId) {
        const audioStageStream = await startAudioStageStream()
        refreshVideoAndAudioStreamIfDefined(videoStream, audioStageStream, {
          cleanupAudio: true
        })
      }
    }

    refreshAudioStream()
  }, [selectedAudioId, isScreenSharing, startAudioStageStream, refreshVideoAndAudioStreamIfDefined])

  useEffect(() => {
    return () => {
      console.log("Cleaning up video & audio tracks")
      stopTracks();
    }
  }, []);

  const toggleMedia = useCallback((deviceType: DeviceType): void => {
    switch (deviceType) {
      case DeviceType.MIC:
        audioStream?.stageStream?.setMuted(!audioStream?.stageStream?.isMuted === true);
        setAudioMuted(audioStream?.stageStream?.isMuted === true);
        break;
      case DeviceType.CAMERA:
        videoStream?.stageStream.setMuted(!videoStream?.stageStream?.isMuted === true);
        setVideoMuted(videoStream?.stageStream?.isMuted === true);
        break;
    }
    refreshVideoAndAudioStreamIfDefined(videoStream, audioStream)
  }, [audioStream, videoStream, refreshVideoAndAudioStreamIfDefined]);

  const toggleScreenShare = useCallback(async () => {
    if (!strategy || !audioStream) return;

    if (isScreenSharing) {
      // Stop composite + screen
      const fallback = await startVideoStageStream()
      refreshVideoAndAudioStreamIfDefined(fallback, audioStream, {
        cleanupVideo: true
      })
      setIsScreenSharing(false);
    } else {
      const result = await startScreenShareStream()
      refreshVideoAndAudioStreamIfDefined(result, audioStream,{
        cleanupVideo: true
      })
      setIsScreenSharing(true);
    }
  }, [audioStream, isScreenSharing, stageRef, strategy, startScreenShareStream, refreshVideoAndAudioStreamIfDefined]);


  return (
    <LocalMediaContext.Provider
      value={{
        toggleMedia,
        isScreenSharing,
        toggleScreenShare, // expose to children
        create: createMedia
      }}
    >
      {children}
    </LocalMediaContext.Provider>
  );
}


import React, { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { LocalMediaContext } from "../context/LocalMediaContext";
import { createLocalStageStream, getPlaybackUrl } from "../service/utils";
import { DeviceType, LocalStorage, LocalStreamEventType } from "../service/enum";
import { useLocalMediaDevices } from "../hooks";
import { useMediaStrategy } from "../hooks/use-media-strategy";
import { LocalStreamEvent, Media } from "../service/type";
import { createScreenShareComposite, createVideoInjectionComposite } from "../service/video";
import { useVideoInjection } from "../hooks/use-video-injection";
import { WebinarVideoInjection } from '@/broadcast/service/type'
import { useBroadcastUser } from "../hooks/use-broadcast-user";

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
  const { userId } = useBroadcastUser()
  const [videoStream, setVideoStream] = useState<Media | undefined>(undefined);
  const [audioStream, setAudioStream] = useState<Media | undefined>(undefined);
  const { selectedVideoId, selectedAudioId, setAudioMuted, setVideoMuted, saveSelectedMedia } = useLocalMediaDevices();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const { setSelectedVideoInjection } = useVideoInjection()

  const videoCleanUpRef = useRef<(() => void) | undefined>(undefined);
  const audioCleanUpRef = useRef<(() => void) | undefined>(undefined);

  const stopTracks = useCallback(() => {
    videoCleanUpRef.current?.();
    videoCleanUpRef.current = undefined;

    audioCleanUpRef.current?.();
    audioCleanUpRef.current = undefined;

    setIsScreenSharing(false);
  }, []);

  const updateVideoState = useCallback((video: Media) => {
    setVideoStream(video);
    setVideoMuted(video.stageStream.isMuted === true);
    saveSelectedMedia(video.deviceId, LocalStorage.VIDEO_ID);
  }, [setVideoStream, setVideoMuted, saveSelectedMedia])

  const updateAudioState = useCallback((audio: Media) => {
    setAudioStream(audio);
    setAudioMuted(audio?.stageStream.isMuted === true);
    saveSelectedMedia(audio.deviceId, LocalStorage.AUDIO_ID);
  }, [setAudioStream, setAudioMuted, saveSelectedMedia])

  const startVideoStageStream = useCallback(async () => {
    const stream = await createLocalStageStream(selectedVideoId, DeviceType.CAMERA)
    if (stream) updateVideoState(stream)
    return stream
  }, [selectedVideoId, updateVideoState])

  const startScreenShareStream = useCallback(async () => {
    const stream = await createScreenShareComposite({
      deviceId: selectedVideoId
    });
    if (stream) updateVideoState(stream)
    return stream
  }, [selectedVideoId, updateVideoState])

  const startVieoInjectionStream = useCallback(async (injection: WebinarVideoInjection) => {

    const playbackUrl = getPlaybackUrl(injection)
    if (!playbackUrl) return undefined

    const composite = await createVideoInjectionComposite({
      source: playbackUrl,
      cameraDeviceId: selectedVideoId,
      micDeviceId: selectedAudioId,
      includeMicrophone: true,
      gains: { video: 0.9, mic: 1.0 },
      fps: 30,
      pip: { enabled: false, height: 180, corner: 'bottom-right' },
      crossOriginAnonymous: true, // if your CDN sends proper CORS headers
    });
    if (composite?.videoMedia) updateVideoState(composite.videoMedia)
    if (composite?.audioMedia) updateAudioState(composite.audioMedia)
    return composite
  }, [selectedVideoId, selectedAudioId, updateVideoState, updateAudioState])

  const startAudioStageStream = useCallback(async () => {
    const stream = await createLocalStageStream(selectedAudioId, DeviceType.MIC)
    if (stream) updateAudioState(stream)
    return stream
  }, [selectedAudioId, updateAudioState])

  const refreshVideoAndAudioStreamIfDefined = useCallback((video: Media | undefined, audio: Media | undefined, options?: RefreshMediaOption) => {
    if (!video) {
      return
    }
    if (!audio) {
      return
    }

    if (options?.cleanupVideo) {
      videoCleanUpRef.current?.()
      videoCleanUpRef.current = video.cleanup;
    }

    if (options?.cleanupAudio) {
      audioCleanUpRef.current?.()
      audioCleanUpRef.current = audio.cleanup
    }


    strategy.updateTracks(video.stageStream, audio.stageStream);
    stageRef.current?.refreshStrategy();
  }, [stageRef, strategy])

  const createMedia = useCallback(async () => {

    const videoStageStream = await startVideoStageStream()
    const audioStageStream = await startAudioStageStream()

    refreshVideoAndAudioStreamIfDefined(videoStageStream, audioStageStream, {
      cleanupVideo: true,
      cleanupAudio: true
    })
  }, [startVideoStageStream, startAudioStageStream, refreshVideoAndAudioStreamIfDefined]);

  useEffect(() => {
    const refreshVideoStream = async () => {
      if (selectedVideoId != videoStream?.deviceId) {
        // TODO - update to support screen share. Create a screen share Provider, be able to grab the screen share and update the camera
        const videoStageStream = await startVideoStageStream()
        refreshVideoAndAudioStreamIfDefined(videoStageStream, audioStream, {
          cleanupVideo: true
        })
      }
    }

    refreshVideoStream()
  }, [selectedVideoId, videoStream?.deviceId, audioStream, startVideoStageStream, refreshVideoAndAudioStreamIfDefined])

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
  }, [selectedAudioId, audioStream?.deviceId, videoStream, startAudioStageStream, refreshVideoAndAudioStreamIfDefined])

  useEffect(() => {
    return () => {
      stopTracks();
    }
  }, [stopTracks]);

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
  }, [audioStream, videoStream, refreshVideoAndAudioStreamIfDefined, setAudioMuted, setVideoMuted]);

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
      refreshVideoAndAudioStreamIfDefined(result, audioStream, {
        cleanupVideo: true
      })
      setIsScreenSharing(true);
    }
  }, [audioStream, isScreenSharing, strategy, startScreenShareStream, startVideoStageStream, refreshVideoAndAudioStreamIfDefined]);

  const toggleVideoInjection = useCallback(async (injection: WebinarVideoInjection | undefined) => {
    if (!injection) {
      const videoMedia = await startVideoStageStream()
      const audioMedia = await startAudioStageStream()
      refreshVideoAndAudioStreamIfDefined(videoMedia, audioMedia, {
        cleanupVideo: true,
        cleanupAudio: true
      })
      setSelectedVideoInjection(undefined)
      return
    }

    const streams = await startVieoInjectionStream(injection)
    refreshVideoAndAudioStreamIfDefined(streams?.videoMedia, streams?.audioMedia ?? audioStream, {
      cleanupVideo: true,
      cleanupAudio: streams?.audioMedia !== undefined
    })
    setSelectedVideoInjection(injection)
  }, [audioStream, setSelectedVideoInjection, startVieoInjectionStream, startAudioStageStream, startVideoStageStream, refreshVideoAndAudioStreamIfDefined])

  const sendStreamEvent = useCallback((type: LocalStreamEventType, payload: Record<string, unknown>) => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
        userId,
        timestamp: new Date().toISOString(),
        type,
        payload,
      } as LocalStreamEvent)
    );

    // Materialize a real ArrayBuffer (not just ArrayBufferLike)
    const event = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(event).set(bytes);

    videoStream?.stageStream.insertSeiMessage(event, { repeatCount: 5 });
  }, [videoStream, userId])


  return (
    <LocalMediaContext.Provider
      value={{
        toggleMedia,
        isScreenSharing,
        toggleScreenShare, // expose to children
        toggleVideoInjection,
        sendStreamEvent,
        create: createMedia
      }}
    >
      {children}
    </LocalMediaContext.Provider>
  );
}

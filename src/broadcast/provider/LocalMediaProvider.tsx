import React, { RefObject, useCallback, useEffect, useState } from "react";
import { LocalMediaContext } from "../context/LocalMediaContext";
import { createCompositeVideoTrack, createLocalStageStream, setupStrategy } from "../service/utils";
import { DeviceType, LocalStorage } from "../service/enum";
import { Strategy } from "../service/type";
import { useLocalMediaDevices } from "../hooks";
import { useBroadcastService } from "../hooks/use-broadcast-service";

type Stage = import("amazon-ivs-web-broadcast").Stage;
type LocalStageStream = import("amazon-ivs-web-broadcast").LocalStageStream;

interface LocalMediaProviderProps {
    stageRef: RefObject<Stage | undefined>
    children: React.ReactNode
}

export function LocalMediaProvider({ children, stageRef }: LocalMediaProviderProps) {
    const [videoStream, setVideoStream] = useState<LocalStageStream | undefined>(undefined);
    const [audioStream, setAudioStream] = useState<LocalStageStream | undefined>(undefined);
    const [strategy, setStrategy] = useState<Strategy | undefined>(undefined);
    const { selectedVideoId, selectedAudioId, setAudioMuted, setVideoMuted, saveSelectedMedia } = useLocalMediaDevices();
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [screenCleanup, setScreenCleanup] = useState<() => void>();
    const {token} = useBroadcastService()

  
    const createMedia = async () => {
        if (!strategy) return;

        const video = await createLocalStageStream(selectedVideoId, DeviceType.CAMERA)
        const audio = await createLocalStageStream(selectedAudioId, DeviceType.MIC)

        if (video && audio) {
            strategy.updateTracks(audio, video);
            setVideoStream(video);
            setVideoMuted(video.isMuted);
            saveSelectedMedia(selectedVideoId, LocalStorage.VIDEO_ID);
  
            setAudioStream(audio);
            setAudioMuted(audio.isMuted);
            saveSelectedMedia(selectedAudioId, LocalStorage.AUDIO_ID);
            stageRef.current?.refreshStrategy();
          }
    }

    useEffect(() => {
      if (!strategy) {
        setupStrategy(token?.role).then(setStrategy);
      }
    }, [strategy, token]);
  
    useEffect(() => {
      if (!strategy && token?.role === 'attendee') return;

      createMedia()
    }, [selectedVideoId, selectedAudioId, strategy, stageRef, token]);
  
    const toggleMedia = useCallback((deviceType: DeviceType): void => {
      switch (deviceType) {
        case DeviceType.MIC:
          const isAudioMuted = audioStream?.isMuted;
          audioStream?.setMuted(!isAudioMuted);
          setAudioMuted(!isAudioMuted);
          break;
        case DeviceType.CAMERA:
          const isVideoMuted = videoStream?.isMuted;
          videoStream?.setMuted(!isVideoMuted);
          setVideoMuted(!isVideoMuted);
          break;
      }
    }, [audioStream, videoStream]);
  
    const toggleScreenShare = useCallback(async () => {
        if (!strategy || !audioStream) return;
      
        if (isScreenSharing) {
          // Stop composite + screen
          screenCleanup?.(); // 👈 stored cleanup fn
          const fallback = await createLocalStageStream(selectedVideoId, DeviceType.CAMERA);
          if (!fallback) return;
          strategy.updateTracks(audioStream, fallback);
          setVideoStream(fallback);
          setIsScreenSharing(false);
          stageRef.current?.refreshStrategy();
        } else {
          const result = await createCompositeVideoTrack( {
            deviceId: selectedVideoId
          } );
          if (!result) return;
      
          const { LocalStageStream } = await import("amazon-ivs-web-broadcast");
          const composite = new LocalStageStream(result.track);
      
          setScreenCleanup(() => result.cleanup); // 👈 store cleanup callback
          strategy.updateTracks(audioStream, composite);
          setVideoStream(composite);
          setIsScreenSharing(true);
          stageRef.current?.refreshStrategy();
        }
      }, [strategy, audioStream, isScreenSharing]);
      
  
    return (
      <LocalMediaContext.Provider
        value={{
          strategy,
          audioStream,
          videoStream,
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
  
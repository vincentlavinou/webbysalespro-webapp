import {
    createContext,
    useMemo,
    PropsWithChildren,
  } from 'react';
  import useLocalMedia from '@/broadcast/device/hooks/useLocalMedia';
  import { LocalMedia } from '@/broadcast/device/data/model/type';
  
  const defaultContextValue = {} as LocalMedia;
  
  const LocalMediaContext = createContext<LocalMedia>(defaultContextValue);
  
  function LocalMediaProvider({ children }: PropsWithChildren) {
    const {
      permissions,
      localVideoMounted,
      localAudioMounted,
      audioDevices,
      videoDevices,
      localAudioStreamRef,
      localVideoStreamRef,
      localAudioDeviceId,
      localVideoDeviceId,
      videoElemRef,
      canvasElemRef,
      refreshSceneRef,
      localScreenShareStreamRef,
      enableCanvasCamera,
      setEnableCanvasCamera,
      updateLocalAudio,
      updateLocalVideo,
      setInitialDevices,
      cleanUpDevices,
      refreshDevices,
      setAudioDevices,
      setVideoDevices,
      startScreenShare,
      stopScreenShare,
    } = useLocalMedia();
  
    const state = useMemo<LocalMedia>(() => {
      return {
        permissions,
        localVideoMounted,
        localAudioMounted,
        audioDevices,
        videoDevices,
        localAudioStreamRef,
        localVideoStreamRef,
        localAudioDeviceId,
        localVideoDeviceId,
        videoElemRef,
        canvasElemRef,
        refreshSceneRef,
        localScreenShareStreamRef,
        enableCanvasCamera,
        setEnableCanvasCamera,
        updateLocalAudio,
        updateLocalVideo,
        setInitialDevices,
        cleanUpDevices,
        refreshDevices,
        setAudioDevices,
        setVideoDevices,
        startScreenShare,
        stopScreenShare,
      };
    }, [
      permissions,
      localVideoMounted,
      localAudioMounted,
      audioDevices,
      videoDevices,
      localAudioStreamRef,
      localVideoStreamRef,
      localAudioDeviceId,
      localVideoDeviceId,
      videoElemRef,
      canvasElemRef,
      refreshSceneRef,
      localScreenShareStreamRef,
      enableCanvasCamera,
      updateLocalAudio,
      updateLocalVideo,
      setInitialDevices,
      cleanUpDevices,
      refreshDevices,
      setAudioDevices,
      setVideoDevices,
      startScreenShare,
      stopScreenShare,
    ]);
  
    return (
      <LocalMediaContext.Provider value={state}>
        {children}
      </LocalMediaContext.Provider>
    );
  }
  
  export default LocalMediaProvider;
  export { LocalMediaContext };
  
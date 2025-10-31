'use client'

import React, { useEffect, useState } from "react"
import { LocalMediaDeviceContext } from "../context/LocalMediaDeviceContext"
import { getDevices } from "../service/utils";
import { LocalStorage } from "../service/enum";
import { useBroadcastService } from "../hooks/use-broadcast-service";

interface LocalMediaDeviceProviderProps {
    children: React.ReactNode
}

export function LocalMediaDeviceProvider({ children }: LocalMediaDeviceProviderProps) {
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioId, setAudioId] = useState<string | null>(null);
    const [videoId, setVideoId] = useState<string | null>(null);
    const [videoIsMuted, setVideoIsMuted] = useState(false)
    const [audioIsMuted, setAudioIsMuted] = useState(true)

    const {token} = useBroadcastService()
  
    useEffect(() => {
      const init = async () => {
        if(token?.role === 'attendee') {
            return
        }
        
        const { audioDevices, videoDevices } = await getDevices();
        setAudioDevices(audioDevices);
        setVideoDevices(videoDevices);
        let savedAudioId = window.localStorage.getItem(LocalStorage.AUDIO_ID)
        let savedVideoId = window.localStorage.getItem(LocalStorage.VIDEO_ID)

        const audioConnected = audioDevices.find((media) => media.deviceId === savedAudioId)
        const videoConnected = videoDevices.find((media) => media.deviceId === savedVideoId)

        if(audioConnected === undefined) {
            savedAudioId = audioDevices[0]?.deviceId
            saveMediaId(savedAudioId, LocalStorage.AUDIO_ID)
            
        }

        if(videoConnected === undefined) {
            savedVideoId = videoDevices[0]?.deviceId
            saveMediaId(savedVideoId, LocalStorage.VIDEO_ID)
        }

        setAudioId(savedAudioId || null)
        setVideoId(savedVideoId || null)
        
      };
      
      init();
    }, [token]);
  
    const saveMediaId = (id: string | undefined, to: LocalStorage) => {
      if(id) {
          window.localStorage.setItem(to, id)
      }
    }

    return <LocalMediaDeviceContext.Provider value={{
        audioDevices,
        videoDevices,
        selectedAudioId: audioId || undefined,
        selectedVideoId: videoId || undefined,
        videoIsMuted,
        audioIsMuted,
        saveSelectedMedia: saveMediaId,
        setAudioMuted: setAudioIsMuted,
        setVideoMuted: setVideoIsMuted,
        setAudioId,
        setVideoId
    }}>
        {children}
    </LocalMediaDeviceContext.Provider>
}
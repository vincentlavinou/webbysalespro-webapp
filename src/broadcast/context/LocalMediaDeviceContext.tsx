'use client'

import { createContext } from "react";
import { LocalStorage } from "../service/enum";

export type LocalMediaDeviceContextType = {
    audioDevices: MediaDeviceInfo[];
    videoDevices: MediaDeviceInfo[];
    selectedAudioId?: string;
    selectedVideoId?: string;
    audioIsMuted: boolean;
    videoIsMuted: boolean;
    saveSelectedMedia: (id: string | undefined, key: LocalStorage) => void
    setAudioMuted: (state: boolean) => void
    setAudioId: (id: string) => void
    setVideoMuted: (state: boolean) => void
    setVideoId: (id: string) => void
}


export const LocalMediaDeviceContext = createContext<LocalMediaDeviceContextType>({
    audioDevices: [],
    videoDevices: [],
    selectedAudioId: undefined,
    selectedVideoId: undefined,
    audioIsMuted: true,
    videoIsMuted: true,
    saveSelectedMedia: () => {},
    setAudioMuted: () => {},
    setAudioId: () => {},
    setVideoMuted: () => {},
    setVideoId: () => {}
})

'use client'
import { createContext, RefObject } from "react"

type ParticipantVideoContextType = {
    screenShareRef: RefObject<HTMLVideoElement | null> | null
    cameraRef: RefObject<HTMLVideoElement | null> | null
    isScreenShare: boolean
    aspectRatio: string
}


export const ParticipantVideoContext = createContext<ParticipantVideoContextType>({
    screenShareRef: null,
    cameraRef: null,
    isScreenShare: false,
    aspectRatio: "aspect-video"
})
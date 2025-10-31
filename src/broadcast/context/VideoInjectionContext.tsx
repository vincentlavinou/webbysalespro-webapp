import { createContext } from "react"
import { WebinarVideoInjection } from "../service/type"


type VideoInjectionContextType = {
    videoInjections: WebinarVideoInjection[]
    isActive: boolean
    setSelectedVideoInjection: (videoInjection: WebinarVideoInjection | undefined) => void
    selectedVideoInjection?: WebinarVideoInjection
}

export const VideoInjectionContext = createContext<VideoInjectionContextType>({
    videoInjections: [],
    isActive: false,
    setSelectedVideoInjection: () => {}
})
import { useCallback, useState } from "react"
import { VideoInjectionContext } from "../context/VideoInjectionContext"
import { WebinarVideoInjection } from "../service/type"

type PresentationProviderProps = {
    videoInjections: WebinarVideoInjection[]
    children: React.ReactNode
}

export const VideoInjectionProvider = ({videoInjections, children}: PresentationProviderProps) => {
    const [isActive, setIsActive] = useState(false)
    const [selectedVideoInjection, setSelectedVideoInjection] = useState<WebinarVideoInjection | undefined>(undefined)

    const setSelectedVideoInjectionCallback = useCallback((videoInjection: WebinarVideoInjection | undefined) => {
        setSelectedVideoInjection(videoInjection)
        setIsActive(videoInjection !== undefined)
    },[setIsActive, setSelectedVideoInjection])

    return <VideoInjectionContext.Provider value={{
        videoInjections: videoInjections,
        isActive,
        setSelectedVideoInjection: setSelectedVideoInjectionCallback,
        selectedVideoInjection
    }}>
        {children}
    </VideoInjectionContext.Provider>
}
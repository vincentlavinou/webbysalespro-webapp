import { useContext } from "react"
import { VideoInjectionContext } from "../context/VideoInjectionContext"


export const useVideoInjection = () => {
    const ctx = useContext(VideoInjectionContext)
    if(!ctx) throw new Error("useVideoInjection must be used a inside VideoInjectionProvider")
    return ctx
}
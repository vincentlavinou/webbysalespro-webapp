import { useContext } from "react"
import { PresentationContext } from "../context/PresentationContext"


export const usePresentation = () => {
    const ctx = useContext(PresentationContext)
    if(!ctx) throw new Error("usePresentation must be used a inside PresentationProvide")
    return ctx
}
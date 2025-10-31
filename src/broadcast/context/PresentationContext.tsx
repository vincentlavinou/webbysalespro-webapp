import { createContext } from "react"
import { WebinarPresentation } from "../service/type"


type PresentationContextType = {
    presentations: WebinarPresentation[]
    isActive: boolean
    setSelectedPresentation: (presentation: WebinarPresentation | undefined) => void
    selectedPresentation?: WebinarPresentation
}

export const PresentationContext = createContext<PresentationContextType>({
    presentations: [],
    isActive: false,
    setSelectedPresentation: () => {}
})
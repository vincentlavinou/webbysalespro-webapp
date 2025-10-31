import { useCallback, useState } from "react"
import { PresentationContext } from "../context/PresentationContext"
import { WebinarPresentation } from "../service/type"

type PresentationProviderProps = {
    presentations: WebinarPresentation[]
    children: React.ReactNode
}

export const PresentationProvider = ({presentations, children}: PresentationProviderProps) => {
    const [isActive, setIsActive] = useState(false)
    const [selectedPresentation, setSelectedPresentation] = useState<WebinarPresentation | undefined>(undefined)

    const setSelectedPresentationCallback = useCallback((presentation: WebinarPresentation | undefined) => {
        setSelectedPresentation(presentation)
        setIsActive(presentation !== undefined)
    },[setIsActive, setSelectedPresentation])

    return <PresentationContext.Provider value={{
        presentations: presentations,
        isActive,
        setSelectedPresentation: setSelectedPresentationCallback,
        selectedPresentation
    }}>
        {children}
    </PresentationContext.Provider>
}
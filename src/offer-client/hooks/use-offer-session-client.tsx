import { useContext } from "react"
import { OfferSessionClientContext } from "../contexts/OfferSessionClientContext"


export function useOfferSessionClient() {
    const ctx = useContext(OfferSessionClientContext)
    if(!ctx) throw new Error("useOfferSessionClient should be used inside OfferSessionClientProvider")
    return ctx
}
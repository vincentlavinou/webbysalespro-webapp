import { useContext } from "react"
import { BroadcastUserContext } from "../context/BroadcastUserContext"


export const useBroadcastUser = () => {
    const ctx = useContext(BroadcastUserContext)
    if(!ctx) throw new Error("useBroadcastUser is not being used inside BroadcastUserProvider")
    return ctx
}
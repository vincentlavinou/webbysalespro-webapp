'use client'
import { createContext } from "react"


export type BroadcastUserContextType = {
    userId: string
}

export const BroadcastUserContext = createContext<BroadcastUserContextType>({
    userId: ""
})
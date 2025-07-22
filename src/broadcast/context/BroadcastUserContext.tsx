'use client'
import { createContext } from "react"


export type BroadcastUserContextType = {
    userId: string
    email?: string
}

export const BroadcastUserContext = createContext<BroadcastUserContextType>({
    userId: "",
    email: undefined
})
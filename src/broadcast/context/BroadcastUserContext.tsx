'use client'
import { createContext } from "react"


export type BroadcastUserContextType = {
    userId: string
    email?: string
    first_name?: string
    last_name?: string
}

export const BroadcastUserContext = createContext<BroadcastUserContextType>({
    userId: "",
    email: undefined,
    first_name: undefined,
    last_name: undefined,
})
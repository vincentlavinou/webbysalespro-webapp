'use client'
import { createContext } from "react"


export type BroadcastUserContextType = {
    attendanceId: string
    email?: string
    first_name?: string
    last_name?: string
}

export const BroadcastUserContext = createContext<BroadcastUserContextType>({
    attendanceId: "",
    email: undefined,
    first_name: undefined,
    last_name: undefined,
})
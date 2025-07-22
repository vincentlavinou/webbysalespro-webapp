'use client'
import { BroadcastUserContext } from "../context/BroadcastUserContext"

export type BroadcastUserProviderProps = {
    userId: string
    email?: string
    children: React.ReactNode
}

export function BroadcastUserProvider({children, userId, email} : BroadcastUserProviderProps) {

    return <BroadcastUserContext.Provider value={{
        userId,
        email
    }}>
        {children}
    </BroadcastUserContext.Provider>

}
'use client'
import { BroadcastUserContext } from "../context/BroadcastUserContext"

export type BroadcastUserProviderProps = {
    userId: string
    children: React.ReactNode
}

export function BroadcastUserProvider({children, userId} : BroadcastUserProviderProps) {

    return <BroadcastUserContext.Provider value={{
        userId
    }}>
        {children}
    </BroadcastUserContext.Provider>

}
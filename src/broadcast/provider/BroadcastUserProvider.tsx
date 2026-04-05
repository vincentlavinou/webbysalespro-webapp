'use client'
import { BroadcastUser } from "../service/type"
import { BroadcastUserContext } from "../context/BroadcastUserContext"

export type BroadcastUserProviderProps = {
    user: BroadcastUser
    children: React.ReactNode
}

export function BroadcastUserProvider({ children, user }: BroadcastUserProviderProps) {

    return <BroadcastUserContext.Provider value={{
        userId: user.user_id,
        registrantId: user.registrant_id,
        attendanceId: user.attendance_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
    }}>
        {children}
    </BroadcastUserContext.Provider>

}

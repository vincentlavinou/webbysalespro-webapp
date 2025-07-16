'use client'

import { useState } from "react";
import { BroadcastServiceContext } from "../context/BroadcastServiceContext"
import { BroadcastServiceToken } from "../service/type";

interface BroadcastServiceProviderProps {
    token: BroadcastServiceToken
    children: React.ReactNode
}

export function BroadcastServiceProvider({ children, token }: BroadcastServiceProviderProps) {

    const [mainPresenterId] = useState<string | undefined>(undefined);
    
    return <BroadcastServiceContext.Provider value={{
        token: token,
        mainPresenterId
    }}>
        {children}
    </BroadcastServiceContext.Provider>
}
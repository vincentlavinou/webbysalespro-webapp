'use client'

import { createContext } from "react";
import { DeviceType, LocalStreamEventType } from "../service/enum";
import { WebinarVideoInjection } from '@/broadcast/service/type'

export type LocalMediaContextType = {
    toggleMedia: (deviceType: DeviceType) => void;
    isScreenSharing: boolean;
    toggleScreenShare: () => void;
    toggleVideoInjection: (injection: WebinarVideoInjection | undefined) => void
    sendStreamEvent: (type: LocalStreamEventType, payload: Record<string, unknown>) => void
    create: () => Promise<void>
}


export const LocalMediaContext = createContext<LocalMediaContextType>({
    toggleMedia: () => {},
    isScreenSharing: false,
    toggleScreenShare: () => {},
    toggleVideoInjection: () => {},
    sendStreamEvent: () => {},
    create: async () => {}
})
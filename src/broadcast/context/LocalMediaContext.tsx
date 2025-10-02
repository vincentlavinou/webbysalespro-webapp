'use client'

import { createContext } from "react";
import { DeviceType } from "../service/enum";

export type LocalMediaContextType = {
    toggleMedia: (deviceType: DeviceType) => void;
    isScreenSharing: boolean;
    toggleScreenShare: () => void;
    create: () => Promise<void>
}


export const LocalMediaContext = createContext<LocalMediaContextType>({
    toggleMedia: () => {},
    isScreenSharing: false,
    toggleScreenShare: () => {},
    create: async () => {}
})
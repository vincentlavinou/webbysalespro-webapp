'use client'

import { createContext } from "react";
import { Strategy } from "../service/type"
import { DeviceType } from "../service/enum";

type LocalStageStream = import("amazon-ivs-web-broadcast").LocalStageStream;

export type LocalMediaContextType = {
    strategy?: Strategy | undefined;
    audioStream?: LocalStageStream | undefined;
    videoStream?: LocalStageStream | undefined;
    toggleMedia: (deviceType: DeviceType) => void;
    isScreenSharing: boolean;
    toggleScreenShare: () => void;
    create: () => Promise<void>
}


export const LocalMediaContext = createContext<LocalMediaContextType>({
    strategy: undefined,
    audioStream: undefined,
    videoStream: undefined,
    toggleMedia: () => {},
    isScreenSharing: false,
    toggleScreenShare: () => {},
    create: async () => {}
})
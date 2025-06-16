'use client'

import { createContext } from "react";
import { BroadcastServiceToken } from "../service/type";

export type BroadcastServiceContextType = {
    token?: BroadcastServiceToken
    mainPresenterId?: string
}


export const BroadcastServiceContext = createContext<BroadcastServiceContextType>({})

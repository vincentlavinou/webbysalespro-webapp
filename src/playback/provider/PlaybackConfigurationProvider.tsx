import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { PlaybackConfigurationContext } from "../context/PlaybackConfigurationContext";

export type PlaybackConfigurationProviderProps = {
    sessionId: string,
    seriesId: string,
    getRequestHeaders?: () => Promise<RequestHeaders | undefined>
    children: React.ReactNode
}

export function PlaybackConfigurationProvider({
    sessionId,
    seriesId,
    getRequestHeaders,
    children
} : PlaybackConfigurationProviderProps) {

    return <PlaybackConfigurationContext.Provider value={{
        sessionId,
        seriesId,
        getRequestHeaders,
    }}>
        {children}
    </PlaybackConfigurationContext.Provider>
}

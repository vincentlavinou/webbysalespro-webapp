import { createContext } from "react"
import { Strategy } from "../service/type"

type SubscribeType = import("amazon-ivs-web-broadcast").SubscribeType;

export type MediaStrategyContextType = {
    strategy: Strategy
}

export const MediaStrategyContext = createContext<MediaStrategyContextType>({
    strategy: {
        updateTracks: () => {},
        setMainPresenter: () => {},
        stageStreamsToPublish: () => {
            return []
        },
        shouldPublishParticipant: () => {
            return false
        },
        shouldSubscribeToParticipant: () => {
            return "none" as SubscribeType
        }

    }
})
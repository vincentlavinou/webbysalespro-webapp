import { useEffect, useState } from "react";
import { MediaStrategyContext } from "../context/MediaStrategyContext"
import { useBroadcastService } from "../hooks/use-broadcast-service"
import { Strategy } from "../service/type";

type SubscribeType = import("amazon-ivs-web-broadcast").SubscribeType;


export type MediaStrategyProviderProps = {
    children: React.ReactNode
}

export const MediaStrategyProvider = (props: MediaStrategyProviderProps) => {

    const { token } = useBroadcastService()
    const [currentStrategy, setCurrentStategy] = useState<Strategy>({
        updateTracks: () => { },
        setMainPresenter: () => { },
        stageStreamsToPublish: () => {
            return []
        },
        shouldPublishParticipant: () => {
            return false
        },
        shouldSubscribeToParticipant: () => {
            return "none" as SubscribeType
        }

    })



    useEffect(() => {
        if (!token?.role) return

        const setupStrategy = async (role: 'host' | 'presenter' | 'attendee'): Promise<void> => {

            const strategy: Strategy = {
                audioTrack: undefined,
                videoTrack: undefined,
                mainPresenter: undefined,

                updateTracks(audio, video) {
                    this.audioTrack = audio;
                    this.videoTrack = video;
                },

                setMainPresenter(presenter) {
                    this.mainPresenter = presenter
                },

                stageStreamsToPublish() {
                    // Host and Presenter can publish
                    return role === "host" || role === "presenter"
                        ? [this.audioTrack!, this.videoTrack!]
                        : [];
                },

                shouldPublishParticipant() {
                    return role === "host" || role === "presenter";
                },

                shouldSubscribeToParticipant(participant) {
                    const participantRole = participant.attributes?.role;
                    const isPresenter = participantRole === "host" || participantRole === "presenter";
                    // 🧑‍💼 Attendee logic
                    if (role === "attendee") {
                        const main = this.mainPresenter?.participant;

                        // ✅ Fallback to host if no main presenter is assigned
                        if (!main && participant.userId.includes('host')) {
                            return "audio_video" as SubscribeType
                        }

                        return participant.userId === main?.userId
                            ? "audio_video" as SubscribeType
                            : "none" as SubscribeType;
                    }

                    // Host/presenters can see all presenters (but not attendees)
                    return isPresenter ? "audio_video" as SubscribeType : "none" as SubscribeType;
                },
                subscribeConfiguration: () => {
                    return {
                        inBandMessaging: {
                            enabled: true
                        }
                    }
                }
            };
            setCurrentStategy(strategy)
        };

        setupStrategy(token.role)

    }, [token?.role])

    return <MediaStrategyContext.Provider value={{
        strategy: currentStrategy
    }}>
        {props.children}
    </MediaStrategyContext.Provider>
}
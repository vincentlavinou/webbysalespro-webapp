"use client";

import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { BroadcastConfigurationProvider } from "./provider";
import { BroadcastUserProvider } from "./provider/BroadcastUserProvider";
import { BroadcastServiceToken, LocalStreamEvent, WebinarPresentation, WebinarVideoInjection } from "./service/type";
import { BroadcastServiceProvider } from "./provider/BroadcastServiceProvider";
import { LocalMediaDeviceProvider } from "./provider/LocalMediaDeviceProvider";
import { LocalMediaProvider } from "./provider/LocalMediaProvider";
import { useRef } from "react";
import { BroadcastStage } from "./components/BroadcastStage";
import { MediaStrategyProvider } from "./provider/MediaStrategyProvider";
import { StageProvider } from "./provider/StageProvider";
import { PresentationProvider } from "./provider/PresentationProvider";
import { VideoInjectionProvider } from "./provider/VideoInjectionContext";

type Stage = import("amazon-ivs-web-broadcast").Stage;

interface BroadcastClientProps {
    sessionId: string,
    getRequestHeaders?: () => Promise<RequestHeaders | undefined>
    accessToken?: string
    broadcastToken: BroadcastServiceToken
    onStreamEvent?: (event: LocalStreamEvent) => void
    isViewer?: boolean
    title?: string,
    presentations?: WebinarPresentation[],
    videoInjections?: WebinarVideoInjection[]
}

export function BroadcastParticipantClient(props: BroadcastClientProps) {

    const stageRef = useRef<Stage | undefined>(undefined);
    return (
        <BroadcastConfigurationProvider sessionId={props.sessionId} getRequestHeaders={props.getRequestHeaders} seriesId={props.broadcastToken.series} accessToken={props.accessToken}>
            <BroadcastUserProvider userId={props.broadcastToken.user_id} email={props.broadcastToken.email}>
                <BroadcastServiceProvider token={props.broadcastToken}>
                    <VideoInjectionProvider videoInjections={props.videoInjections ?? []}>
                        <PresentationProvider presentations={props.presentations ?? []}>
                        <MediaStrategyProvider>
                            <LocalMediaDeviceProvider>
                                <LocalMediaProvider stageRef={stageRef}>
                                    <StageProvider stageRef={stageRef} onStreamEvent={props.onStreamEvent ? props.onStreamEvent : () => {}} isViewer={props.isViewer || false}>
                                        <BroadcastStage token={props.broadcastToken} title={props.title} />
                                    </StageProvider>
                                </LocalMediaProvider>
                            </LocalMediaDeviceProvider>
                        </MediaStrategyProvider>
                    </PresentationProvider>
                </VideoInjectionProvider>
            </BroadcastServiceProvider>
        </BroadcastUserProvider>
        </BroadcastConfigurationProvider >
    )
}
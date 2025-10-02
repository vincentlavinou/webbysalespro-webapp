"use client";

import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { BroadcastConfigurationProvider } from "./provider";
import { BroadcastUserProvider } from "./provider/BroadcastUserProvider";
import { BroadcastServiceToken } from "./service/type";
import { BroadcastServiceProvider } from "./provider/BroadcastServiceProvider";
import { LocalMediaDeviceProvider } from "./provider/LocalMediaDeviceProvider";
import { LocalMediaProvider } from "./provider/LocalMediaProvider";
import { useRef } from "react";
import { BroadcastStage } from "./components/BroadcastStage";
import { MediaStrategyProvider } from "./provider/MediaStrategyProvider";
import { StageProvider } from "./provider/StageProvider";

type Stage = import("amazon-ivs-web-broadcast").Stage;

interface BroadcastClientProps {
    sessionId: string,
    getRequestHeaders?: () => Promise<RequestHeaders | undefined>
    accessToken?: string
    broadcastToken: BroadcastServiceToken
    title?: string,
}

export function  BroadcastClient(props: BroadcastClientProps) {

    const stageRef = useRef<Stage | undefined>(undefined);
    return (
        <BroadcastConfigurationProvider sessionId={props.sessionId} getRequestHeaders={props.getRequestHeaders} seriesId={props.broadcastToken.series} accessToken={props.accessToken}>
            <BroadcastUserProvider userId={props.broadcastToken.user_id}>
                <BroadcastServiceProvider token={props.broadcastToken}>
                    <MediaStrategyProvider>
                        <LocalMediaDeviceProvider>
                            <LocalMediaProvider stageRef={stageRef}>
                                <StageProvider stageRef={stageRef}>
                                    <BroadcastStage token={props.broadcastToken} title={props.title} />
                                </StageProvider>
                            </LocalMediaProvider>
                        </LocalMediaDeviceProvider>
                    </MediaStrategyProvider>
                </BroadcastServiceProvider>
            </BroadcastUserProvider>
        </BroadcastConfigurationProvider>
    )
}
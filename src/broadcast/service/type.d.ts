import { LocalStageStream } from "amazon-ivs-web-broadcast";
import { BroadcastServiceType } from "./enum"
import { Webinar } from "@/service/webinar";
import { SeriesSession } from "@/service/webinar/type";
type StageStrategy = import("amazon-ivs-web-broadcast").StageStrategy;

export interface Strategy extends StageStrategy {
    audioTrack?: LocalStageStream;
    videoTrack?: LocalStageStream;
    mainPresenter?: WebiSalesProParticipant
    updateTracks: (audio: LocalStageStream, video: LocalStageStream) => void
    setMainPresenter: (presenter: WebiSalesProParticipant) => void
  }

export type BroadcastServiceToken = {
    stream_token: string
    role: "host" | "presenter" | "attendee"
    series: string
    region: string
    user_id: string
    email?: string
    webinar: Webinar
    session: SeriesSession
}

export type CreateBroadcastToken = {
    webinar: string,
    access_token?: string
}

export type IVSMetadata = {
    endpoints: {
        rtmp: string
        whip: string
        rtmps: string
        events: string
    }
}

export type Broadcast = {
    id: string
    service: BroadcastServiceType
    service_id: string
    metadata?: IVSMetadata
    created_at: string
    destroyed_at?: string
    webinar: string
    session: string
}

export type Media = {
    stageStream: LocalStageStream
    track: MediaStreamTrack
    deviceId: string | undefined
    cleanup: () => void
}
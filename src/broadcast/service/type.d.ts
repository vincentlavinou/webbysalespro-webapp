import { LocalStageStream } from "amazon-ivs-web-broadcast";
import { BroadcastServiceType } from "./enum"
type StageStrategy = import("amazon-ivs-web-broadcast").StageStrategy;

export interface Strategy extends StageStrategy {
    audioTrack?: LocalStageStream;
    videoTrack?: LocalStageStream;
    mainPresenter?: WebiSalesProParticipant
    updateTracks: (audio: LocalStageStream, video: LocalStageStream) => void
    setMainPresenter: (presenter: WebiSalesProParticipant) => void
  }

export type Chat = {
    room: string
    token: string
    token_expiration_time: string
    session_expiration_time: string
    region: string
}

export type ChatService = {
    role: 'host' |'presenter' | 'attendee'
    webinar: string
    chat: Chat
}

export type BroadcastServiceToken = {
    stream_token: string
    role: "host" | "presenter" | "attendee"
    webinar: string
    region: string
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
}
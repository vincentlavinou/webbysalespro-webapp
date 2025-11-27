import { LocalStageStream } from "amazon-ivs-web-broadcast";
import { BroadcastServiceType, LocalStreamEventType, PlaybackMetadataEventType } from "./enum"
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

export type StreamAttendeeConfig = {
    channel_arn: string
    playback_url: string
}

export type StreamParticipantConfig = {
    stage_arn: string
    participant_token: string
}

export type StreamConfig = {
    kind: "realtime" | "channel"
    region: string
    config: StreamAttendeeConfig | StreamParticipantConfig
}

export type BroadcastServiceToken = {
    stream: StreamConfig
    role: "host" | "presenter" | "attendee"
    series: string
    region: string
    user_id: string
    email?: string
    webinar: Webinar
    session: SeriesSession
}

export type AttendeeStreamConfig = {
    kind: "realtime" | "channel"
    region: string
    config: StreamAttendeeConfig
}

export type AttendeeBroadcastServiceToken = {
    stream?: AttendeeStreamConfig
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

export type LocalStreamEvent = {
    id: string,
    userId: string
    timestamp: string,
    type: LocalStreamEventType
    payload: Record<string, unknown>
}

export type WebinarSessionUpdatePayload = {
    session_id: string
    status: string
}

export type WebinarOfferVisibilityPayload = {
    session_id: string
    visible: boolean
    shown_at: string
}

export type PlaybackMetadataEvent = {
    type: PlaybackMetadataEventType,
    payload: WebinarSessionUpdatePayload | WebinarOfferVisibilityPayload
}

export type VideoStatus = 'uploaded' | 'processing' | 'ready' | 'failed';
export type VideoSource = 'upload' | 'url' | 'youtube' | 'vimeo';

export interface WebinarVideoInjection {
  id: string;
  webinarId: string;
  title: string;
  description?: string;

  source: VideoSource;
  fileUrl?: string;
  originalUrl?: string;
  playbackUrl?: string;
  mimeType?: string;

  status: VideoStatus;
  durationMs: number;
  width: number;
  height: number;
  thumbnailUrl?: string;

  order: number;
  isActive: boolean;

  createdBy?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type WebinarPresentation = {
  id: string
  title: string
  description: string
  original_filename: string
  file_size?: number
  slide_count?: number
  processed: boolean
  is_active: boolean
  is_default_for_webinar: boolean
  download_url?: string
  created_at: string
  updated_at: string
  assets_prefix?: string
}
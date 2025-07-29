import { WebinarMedia } from "../media"
import { WebinarSeriesStatus, WebinarSeriesType, WebinarSessionStatus } from "./enum"
import { Broadcast } from "@/broadcast/service"


export type QueryWebinar = {
    search?: string
    page?: number
    page_size?: number
    session?: string
    ordering?: string
    status?: string[]
}

export type WebinarSetting = {
    id: string
    is_searchable: boolean
    waiting_room_start_time: number
    duration_minutes: number
    max_attendees: number
    branding_config: {[key: string]: string}
    created_at: string
    updated_at: string
}

export type WebinarPresenter = {
    id: string
    name: string
    email: string
    access_token?: string
    created_at: string
    updated_at: string
}

export type WebinarAttendee = {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    registered_at: string
    created_at: string
    updated_at: string
}

export type WebinarAttendeeTableRow = {
    attendee_id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    link?: string
    registered_at: string
    session_id: string
    session_scheduled_start: string
    session_timezone: string
    created_at: string
    updated_at: string
}

export type WebinarPresenterRequest = {
    name: string
    email: string
}

export type WebinarOffer = {
  id: string;
  webinar: string; // UUID of the parent webinar
  provider: string;
  provider_display: string;
  nternal_name: string;
  headline: string;
  description: string;
  price: number;
  currency: string; // e.g., 'USD', 'EUR'
  media: WebinarMedia[]
  is_active?: boolean;
  quantity_limit?: number | null;
  start_time?: string | null; // ISO 8601 string
  end_time?: string | null;   // ISO 8601 string
  currency_display: string; // e.g., 'US Dollar'
  created_at: string;
  updated_at: string;
};

export type SeriesSession = {
    id: string
    status: WebinarSessionStatus
    scheduled_start: string
    timezone: string
    attendees?: WebinarAttendee[]
    offer_visible: boolean
    offer_shown_at?: string
}

export type WebinarSeries = {
    id: string,
    type: WebinarSeriesType
    status: WebinarSeriesStatus,
    sessions: SeriesSession[]
}

export type SeriesSessionRequest = {
    id?: string
    scheduled_start: string
    timezone: string
}

export type WebinarSeriesRequest = {
    type: WebinarSeriesType,
    session: SeriesSessionRequest
}

export type ConvertWebinarSeriesRequest = {
    type: Webinar
}

export type Webinar = {
    id: string
    owner: number
    name: string
    title: string
    description: string
    created_at: string
    updated_at: string
    broadcast: Broadcast
    media: WebinarMedia[]
    settings: WebinarSetting
    presenters: WebinarPresenter[]
    series?: WebinarSeries[]
    offers: WebinarOffer[]
}
  
export type WebinarRequest = {
    name: string
    title: string
    description?: string
    duration_minutes?: number
    max_attendees?: number
    media_ids?: string[]
}

export type CloneWebinarRequest = {
    title?: string
    description?: string
    clone_presenters: boolean
    clone_attendees: boolean
}

export type SessionOfferVisibilityUpdate = {
  session_id: string; // e.g. "Offer visibility updated"
  visible: boolean;
  shown_at?: string; // ISO 8601 datetime or null
}
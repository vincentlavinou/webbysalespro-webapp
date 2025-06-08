import { WebinarMedia } from "../media"
import { WebinarSessionSeriesStatus, WebinarSessionSeriesType } from "./enum"
import { Broadcast } from "@/broadcast/service"


export type QueryWebinar = {
    search?: string
    page?: number
    page_size?: number
    ordering?: string // Default ordering by created_at descending
}

export type WebinarSetting = {
    id: string
    is_searchable: boolean
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
    access_token?: string
    created_at: string
    updated_at: string
}

export type WebinarPresenterRequest = {
    name: string
    email: string
}

export type WebinarSessionSeries = {
    id: string,
    status: WebinarSessionSeriesStatus,
    type: WebinarSessionSeriesType
}

export type WebinarSession = {
    id: string
    status: string
    scheduled_start: string
    timezone: string
    attendees?: WebinarAttendee[]
}

export type WebinarSessionRequest = {
    scheduled_start: string
    timezone: string
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
    sessions?: WebinarSession[]
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
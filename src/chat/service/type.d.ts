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
    user_id: string
    chat_config: ChatConfigUpdate
    // True when the join session belongs to an anonymous guest — the token is
    // view-only and the attendee must claim a real identity before sending.
    requires_registration?: boolean
}

export type ChatRecipient = {
    label: string
    value: string
}

export type ChatMetadata = {
    recipient: string
}

export type ChatMode = 'public' | 'private' | 'locked'

export type PinnedAnnouncement = {
    id: string
    content: string
    cta_label: string
    cta_url: string
    order: number
    pinned_at: string
    pinned_by_type: 'host' | 'presenter' | 'moderator'
}

export type ChatConfigUpdate = {
    session_id: string
    chat_session_id: string
    is_enabled: boolean
    mode: ChatMode
    is_active: boolean
    opened_at: string | null
    closed_at: string | null
    pinned_announcements: PinnedAnnouncement[]
}
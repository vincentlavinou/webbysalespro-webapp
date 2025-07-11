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
}

export type ChatRecipient = {
    label: string
    value: string
}

export type ChatMetadata = {
    recipient: string
}
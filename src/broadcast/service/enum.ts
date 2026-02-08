export enum DeviceType {
    MIC = 'mic',
    CAMERA = 'camera',
    SCREEN = 'screen'
}

export enum BroadcastServiceType {
    IVS = 'IVS'
}

export enum LocalStorage {
    VIDEO_ID = 'local-video-id',
    AUDIO_ID = 'local-audio-id'
}

export enum LocalStreamEventType {
    OFFER_EVENT = "offer-event"
}

export enum PlaybackMetadataEventType {
    OFFER = "webinar:offer:visibility",
    OFFER_SCARCITY = "session:offer:scarcity:update",
    SESSION = "webinar:session:update",
    VIDEO_INJECTION = "webinar:video-injection:update"
}
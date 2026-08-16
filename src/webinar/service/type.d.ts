// The webinar domain now comes from the shared package, which mirrors the DRF
// serializers field for field and carries a test per correction.
//
// Types are re-exported under the names this app already uses, so the files
// importing `Webinar` do not change. What did change is what `Webinar` means:
// these surfaces read `/v1/webinars/{id}/public/`, which is
// `PublicWebinarSerializer` — twelve fields — and not the authenticated console
// payload this file used to describe. Four fields it declared as required are
// not sent by that endpoint at all:
//
//   Webinar.owner, .name, .broadcast, .offers
//
// None was read, which is why nothing was visibly broken. `broadcast` and
// `offers` are not on the authenticated payload either — `broadcast` is not a
// field anywhere, and `offers` is a reverse relation the serializer never
// declares.
//
// Also corrected: WebinarSeries has no `status` (the serializer emits
// `lifecycle`), the public presenter payload has no timestamps, and the three
// `SeriesSession.resolved_*` fields are always present rather than optional.
//
// WebinarSeries is a discriminated union on `type` now, because the serializer
// adds keys per variant. `registration_behavior` exists only on a recurring
// series — use `allowsManualSessionSelection` rather than reading it directly.

import type {
    PublicWebinarDto,
    WebinarPauseInfoDto,
} from '@lavinou/webbysalespro/webinar'

// --- read shapes -----------------------------------------------------------

export type {
    // These surfaces are public. The authenticated shape is `WebinarDto`, and
    // this app should not be reaching for it.
    PublicWebinarDto as Webinar,
    WebinarSettingDto as WebinarSetting,
    PublicPresenterDto as WebinarPresenter,
    SeriesSessionDto as SeriesSession,
    WebinarSeriesDto as WebinarSeries,
    SingleWebinarSeriesDto as SingleWebinarSeries,
    MultiWebinarSeriesDto as MultiWebinarSeries,
    RecurringWebinarSeriesDto as RecurringWebinarSeries,
    SeriesRegistrationBehaviorDto as WebinarSeriesRegistrationBehavior,
    SeriesLinkBehaviorDto as WebinarSeriesLinkBehavior,
    PublicWebinarRegistrationSettingsDto as WebinarRegistrationSettings,
    RegistrationThemeDto as WebinarRegistrationTheme,
    // The paused-webinar notice, which arrives on a 404 body rather than on a
    // webinar payload. Its text fields are always strings — the backend
    // substitutes "" — where this file used to type them nullable.
    WebinarPauseInfoDto as WebinarPauseInfo,
} from '@lavinou/webbysalespro/webinar'

// --- write shapes ----------------------------------------------------------

export type {
    WriteWebinarBody as WebinarRequest,
    CloneWebinarBody as CloneWebinarRequest,
    WriteWebinarSeriesBody as WebinarSeriesRequest,
    WriteSeriesSessionBody as SeriesSessionRequest,
    // This used to read `{ type: Webinar }` — a whole webinar where the
    // serializer takes a series type string.
    ConvertWebinarSeriesBody as ConvertWebinarSeriesRequest,
    WritePresenterBody as WebinarPresenterRequest,
    WebinarListQuery as QueryWebinar,
} from '@lavinou/webbysalespro/webinar'

// --- shapes this app still owns --------------------------------------------
//
// The registration and join flows, which are this app's own surface area
// rather than webinar payloads.

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

export type RegistrationEmbedConfig = {
    id: string
    name: string
    source: string
    show_title?: boolean
    background_color?: string | null
    primary_color?: string | null
    secondary_color?: string | null
    secondary_background_color?: string | null
    button_text_color?: string | null
    header_scripts?: string | null
    success_url?: string | null
    created_at: string
    updated_at: string
}

/**
 * What `getPublicWebinarState` resolves to.
 *
 * A paused webinar 404s so it vanishes from public surfaces, and the body
 * carries the notice — so "paused" and "not found" are the same status code
 * and only the payload separates them.
 */
export type WebinarPublicState =
    | { kind: "webinar"; webinar: PublicWebinarDto }
    | { kind: "paused"; pauseInfo: WebinarPauseInfoDto }
    | { kind: "not_found" }

export type RegisterAttendeeResponse = {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    access_token: string
    webinar: string
}

export type RegisterV2Grant = {
    join_url?: string
    short_link_resolution_failed?: boolean
    join_token?: {
        token: string
    }
}

export type RegisterV2Response = {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    grants: RegisterV2Grant[]
}

export type SessionOfferVisibilityUpdate = {
  session_id: string;
  visible: boolean;
  shown_at?: string; // ISO 8601 datetime or null
}

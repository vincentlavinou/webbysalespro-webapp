// The webinar vocabularies now come from the shared package, which mirrors the
// backend's `models.TextChoices` classes and has a test per value.
//
// Re-exported under the names this app already uses, so the files importing
// them do not change. Each is a const object plus a union type of the same
// name: `WebinarSessionStatus.IN_PROGRESS` reads exactly as it did, but a plain
// string is now assignable, which a TypeScript enum never allowed. That is what
// lets `isSeriesSessionDto` check a payload's status without casting it first.
//
// `WebinarSeriesStatus` is gone. It only ever typed `WebinarSeries.status`, and
// a series has no status — the serializer emits `lifecycle`, and always has.

export {
    SeriesSessionStatus as WebinarSessionStatus,
    WebinarSeriesType,
} from '@lavinou/webbysalespro/webinar'

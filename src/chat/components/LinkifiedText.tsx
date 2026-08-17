// Re-exported from the platform package.
//
// Fixes two bugs this fork had. It stripped trailing punctuation off a match
// and then advanced past the raw match anyway, so "see example.com, thanks"
// rendered without its comma — text a user typed silently disappearing. And it
// had no date check, so "2026-05-28" rendered as a tappable tel: link.
export { LinkifiedText } from "@lavinou/webbysalespro/chat/ui"
export { linkifyParts } from "@lavinou/webbysalespro/chat"
export type { LinkPart } from "@lavinou/webbysalespro/chat"

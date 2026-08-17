// Re-exported from the platform package.
//
// The shared bubble is the union of both forks: this app's blocked-message
// treatment, plus the console's mute badge and moderation actions slot.
//
// `spectator` is badged "Support" now. Neither fork badged it, so a support
// seat posting in a live room looked like any other attendee.
export { ChatMessageBubble } from "@lavinou/webbysalespro/chat/ui"
export type { ChatMessageBubbleProps, ChatReaction } from "@lavinou/webbysalespro/chat/ui"
export { staffRoleLabel } from "@lavinou/webbysalespro/chat"

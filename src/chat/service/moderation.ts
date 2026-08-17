// Re-exported from the platform package.
//
// The shared filter is the union of both apps' rules: this app's email, phone
// and bare-domain link detection, plus the console's role vocabulary — `cohost`
// and `spectator` were missing here while the backend already returned them,
// so threading one through was a type error.
//
// The role lists are allowlists now, so a role this build has not heard of is
// untrusted by default rather than granted a host's leniency.
export { CensorType, moderateText } from "@lavinou/webbysalespro/chat"
export type {
  ModerationDecision,
  ModerationDecisionCode,
  ModerationOptions,
  ModerationReason,
  ModerationRole,
} from "@lavinou/webbysalespro/chat"

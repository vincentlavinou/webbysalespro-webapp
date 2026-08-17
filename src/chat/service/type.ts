// Re-exported from the platform package, verified against chat/serializers.py.
//
// `ChatService` no longer carries `user_id` — the endpoint has never returned
// one, so the mid-stream registration-claim path that read it never ran. Read
// the participant's chat identity from `ChatMessage.sender.userId`.
//
// `chat_config` is gone for the same reason: it is not in the token response.
// Chat config comes from the hydration GET, which `ChatConfigProvider` owns.
export type {
  Chat,
  ChatConfigUpdate,
  ChatMetadata,
  ChatMode,
  ChatRecipient,
  ChatService,
  ChatServiceRole,
  PinnedAnnouncement,
} from "@lavinou/webbysalespro/chat"

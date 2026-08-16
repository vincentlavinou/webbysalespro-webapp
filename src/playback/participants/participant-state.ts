// Publisher vocabulary lives in the shared package now.
//
// Re-exported under the same names so the solo path, the realtime connection
// and the arrangement resolver do not change their imports.
//
// One behaviour changes, and it is the console's copy winning: `isLiveVideo`
// now also requires `readyState === 'live'`. A track that has ended can stay in
// the streams array, so this app was drawing a tile for it and the stage showed
// attendees one more tile than the host was told about.
//
// `isRenderable` also takes an optional second argument now — the id of a source
// this client is itself publishing. An attendee publishes nothing, so it is
// never passed here. Note it cannot be handed straight to `Array.filter`, which
// would pass the index into it; wrap it in an arrow.

export {
  SOURCE_KINDS,
  getParticipantName,
  hasActiveVideo,
  isLiveVideo,
  isPublishingRole,
  isRenderable,
  isSourceParticipant,
  participantAttributes,
  participantKind,
  participantRole,
} from "@lavinou/webbysalespro/stage";

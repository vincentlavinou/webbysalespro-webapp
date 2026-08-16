// The stage geometry lives in the shared package now.
//
// This file and its twin in webbysalespro-admin-webapp each carried a comment
// asking a human to keep them in sync with the other. They drifted anyway — in
// three places, all of which this app is on the winning side of, so nothing
// this app renders changes. The console picks up the two-column phone gallery,
// the flat 16:9 gallery box and the `auto-rows-fr` fix that only this app could
// ever have hit.
//
// Re-exported under the same names so `AttendeeStageViewer` does not change.

export {
  DOCKED_RAIL,
  DOCKED_RAIL_TILE,
  FLOATING_RAIL_TILE,
  MAIN_TILE_FILL,
  dockedRowClass,
  floatingRailClass,
  galleryColumns,
  galleryGridClass,
  showTileName,
  stageSurfaceAspect,
  tileObjectFit,
} from "@lavinou/webbysalespro/stage";

export type { StageTileSlot } from "@lavinou/webbysalespro/stage";

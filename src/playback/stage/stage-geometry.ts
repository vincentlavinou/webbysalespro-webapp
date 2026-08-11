/**
 * The geometry of a rendered stage, shared by every surface that draws one.
 *
 * Keep in sync with `src/broadcast/service/stage-geometry.ts` in webbysalespro-admin-webapp.
 *
 * `stage-state.ts` made the *arrangement* single-valued — which tiles
 * exist and who is on them. That is necessary but not sufficient: the console and
 * the attendee then drew that same arrangement with different numbers (a 20% rail
 * against a 33% one, an aspect-boxed main tile against a filling one, contain
 * against cover), so the console still misrepresented what was going out. This
 * module is the other half of the contract.
 *
 * The split to keep in mind: **outer fit is per-host, inner composition is
 * shared.** The console's stage lives in a flex row next to a toolkit and has to
 * fit that row; the attendee's fills a page. Those framings legitimately differ.
 * Everything *inside* the frame — the proportion between main and rail, column
 * counts, gaps, object-fit, which tiles carry a name — must not, because that is
 * what a host is reading when they decide the stage looks right.
 */

export type StageTileSlot = 'main' | 'gallery' | 'rail'

/** The gap between tiles. One value everywhere; `gap-2` on the console read as a wider rail. */
const GAP = 'gap-1'

/**
 * Column count for a gallery.
 *
 * Deliberately coarse: past two tiles a second column costs less height than a
 * third column costs width, and a 16:9 cell squashed into a third of the width is
 * worse than a slightly letterboxed one. The console previously went to three and
 * four columns, so a five-camera stage looked nothing like the audience's.
 */
export function galleryColumns(count: number) {
  return count > 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
}

export function galleryGridClass(count: number) {
  return `grid h-full w-full bg-black ${GAP} ${galleryColumns(count)}`
}

/**
 * The aspect the surface should take.
 *
 * A 16:9 surface has no vertical room to split, so a multi-tile gallery gets a
 * taller box on small screens. A single tile — and any feature shape — follows the
 * source's own aspect instead, because there the surface frames one video rather
 * than a mosaic.
 */
export function stageSurfaceAspect(
  shape: 'off-air' | 'gallery' | 'feature',
  tileCount: number,
  sourceAspect = 'aspect-video',
) {
  return shape === 'gallery' && tileCount > 1 ? 'aspect-[4/3] sm:aspect-video' : sourceAspect
}

/** The row holding a main tile and a docked rail. */
export function dockedRowClass(side: 'left' | 'right') {
  return `flex h-full w-full ${side === 'left' ? 'flex-row-reverse' : 'flex-row'}`
}

/**
 * The main tile inside a composition: it takes whatever the rail leaves.
 *
 * `flex-1` rather than an aspect box. The console used to size this from the
 * source aspect and centre it, which meant a docked rail did not actually shrink
 * the main tile the way it does for attendees — the two pictures disagreed most
 * in exactly the case the rail exists for.
 */
export const MAIN_TILE_FILL = 'relative min-w-0 flex-1 overflow-hidden bg-black'

/** A docked rail: a third of the width, tiles splitting its height. */
export const DOCKED_RAIL = `flex h-full w-1/3 shrink-0 flex-col ${GAP}`
export const DOCKED_RAIL_TILE = 'min-h-0 flex-1 border-white/30'

/**
 * A floating rail: a narrow column laid over the main tile.
 *
 * Narrower than a docked rail on purpose — it covers main-stage footage rather
 * than taking space beside it, so every extra percent is content the viewer
 * loses. Height is capped so a full rail scrolls instead of running off the stage.
 */
export function floatingRailClass(side: 'left' | 'right') {
  return `absolute top-2 z-10 flex max-h-[calc(100%-1rem)] w-1/5 min-w-[64px] flex-col overflow-y-auto ${GAP} ${side === 'left' ? 'left-2' : 'right-2'}`
}
export const FLOATING_RAIL_TILE = 'aspect-video shrink-0 overflow-hidden rounded-lg border border-white/30 shadow-2xl'

/**
 * How a tile's video fills its box.
 *
 * Cropping a camera to fill its cell costs a little headroom and reads better
 * than letterboxing. Cropping *content* costs whatever sits outside the centre —
 * slide edges, terminal text, the thing being demoed — so content is always
 * letterboxed, and so is the main tile whatever is on it.
 */
export function tileObjectFit(kind: unknown, slot: StageTileSlot) {
  const isContent = kind === 'screen' || kind === 'presentation' || kind === 'video_injection'
  return slot === 'gallery' && !isContent ? 'object-cover' : 'object-contain'
}

/**
 * Whether a tile carries a name label.
 *
 * Rail tiles do not: they are small, and at that size the label covers most of
 * the face it is labelling. The console used to label every tile, which is a
 * visible difference from the audience's stage even though it changes no layout.
 */
export function showTileName(slot: StageTileSlot) {
  return slot !== 'rail'
}

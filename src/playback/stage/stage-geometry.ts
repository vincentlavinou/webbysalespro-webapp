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
 *
 * Two columns at every width, phones included. Stacking there was tried and is
 * worse: a viewer needs to see that two people are on the stage more than they
 * need either face large, and the stacked layout read as the co-host not being
 * there at all. A solo gallery takes the whole grid — putting the only camera on
 * the stage in a two-column grid parks it in the left half.
 */
export function galleryColumns(count: number) {
  return count > 1 ? 'grid-cols-2' : 'grid-cols-1'
}

/**
 * `auto-rows-fr` is load-bearing, not tidying.
 *
 * Implicit grid rows are `auto`, so they take their height from their content —
 * and the attendee's first cell has none to give. It is an empty container that
 * the persistent <video> is appended into as `position:absolute`, which adds
 * nothing to its parent's height. Any row holding only that cell collapsed to a
 * sliver while the row below overflowed the surface, which is what stacking on a
 * phone produced. Equal fractional rows make every cell a real share of the
 * surface whether or not anything inside it has an intrinsic size.
 *
 * The console never hit this — it renders a real <video> in every cell — which is
 * why the rule belongs in this shared file rather than in whichever surface
 * happens to trip over it.
 */
export function galleryGridClass(count: number) {
  return `grid h-full w-full auto-rows-fr bg-black ${GAP} ${galleryColumns(count)}`
}

/**
 * The aspect the surface should take.
 *
 * A multi-tile gallery is a mosaic, not a window onto one source, so it takes a
 * fixed 16:9 box rather than following whatever the main track happens to
 * publish. At 2x2 that box divides into four 16:9 cells exactly; at two tiles the
 * cells come out portrait and `tileObjectFit` crops them to the centre, which is
 * where a webcam puts a face.
 *
 * The taller small-screen box this used to return existed only to give a stacked
 * mobile gallery vertical room. Nothing stacks now, and keeping it would have
 * squeezed two side-by-side cells into an even narrower slice.
 *
 * A single tile — and any feature shape — follows the source's own aspect, because
 * there the surface really is framing one video.
 */
export function stageSurfaceAspect(
  shape: 'off-air' | 'gallery' | 'feature',
  tileCount: number,
  sourceAspect = 'aspect-video',
) {
  return shape === 'gallery' && tileCount > 1 ? 'aspect-video' : sourceAspect
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

/**
 * How wide a rail is, docked or floating.
 *
 * One value for both. A rail is a glance at who else is on the call; the main
 * tile is what the viewer came for, so the rail takes as little width as it can
 * read at. The docked rail used to take a third — the same stage lost a visibly
 * bigger bite of its main tile when a host docked the rail than when they
 * floated it, for no reason the viewer could see.
 */
const RAIL_WIDTH = 'w-1/5 min-w-[64px]'

/**
 * A docked rail: the same narrow column as a floating one, beside the main tile
 * rather than over it. Tiles keep their own aspect and the column scrolls, so a
 * two-camera rail does not stretch each tile down half the stage.
 */
export const DOCKED_RAIL = `flex h-full ${RAIL_WIDTH} shrink-0 flex-col overflow-y-auto ${GAP}`
export const DOCKED_RAIL_TILE = 'aspect-video shrink-0 overflow-hidden border-white/30'

/**
 * A floating rail: the rail laid over the main tile instead of beside it.
 *
 * Height is capped so a full rail scrolls instead of running off the stage.
 */
export function floatingRailClass(side: 'left' | 'right') {
  return `absolute top-2 z-10 flex max-h-[calc(100%-1rem)] ${RAIL_WIDTH} flex-col overflow-y-auto ${GAP} ${side === 'left' ? 'left-2' : 'right-2'}`
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

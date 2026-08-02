# Copying components into webbysalespro-motion

No shared package yet — copy-paste is the sharing mechanism for now. This is a map of
what's safe to copy as-is, what needs a small change, and what doesn't apply to a
rendered video at all.

All Radix-based primitives here import from the unified `radix-ui` package (not the
individual `@radix-ui/react-*` packages), matching how webbysalespro-motion's own
`src/components/ui/` already imports Radix. That was the main friction point for
copying files between the two repos — it's gone now, so these files should paste in
with no import surgery.

## Copy as-is

`badge.tsx`, `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `separator.tsx`,
`skeleton.tsx`, `textarea.tsx`, `empty-state.tsx`, `live-indicator.tsx`,
`accordion.tsx`, `avatar.tsx`, `progress.tsx`, `scroll-area.tsx` — no app-specific
imports (no Next.js, no app Context/hooks). Only dependency is `cn()` from
`@/lib/utils` (a ~5-line function, copy `src/lib/utils.ts` too if it's not already
in the target repo — webbysalespro-motion already has its own).

`dropdown-menu.tsx`, `select.tsx`, `sheet.tsx`, `tooltip.tsx`, `info-icon.tsx` — also
portable, but they're interaction-driven (hover/click to open). In a Remotion
composition there's no real user input, so any open/closed state has to be driven
by props tied to `useCurrentFrame()` rather than left to real interaction.

**Known drift as of 2026-07:** webbysalespro-motion's existing copies of `button.tsx`,
`badge.tsx`, and `card.tsx` were pulled from a newer shadcn generation and have
diverged in a few class names and variants (e.g. badge is `rounded-full` there vs
`rounded-md` here, button has extra `xs`/`icon-sm`/`icon-lg` sizes). If you copy this
repo's version over, it becomes the source of truth going forward — no auto-sync,
so re-copy after future edits here.

## Needs adaptation before copying

- **Design tokens (`globals.css`).** The two repos' OKLCH color variables
  (`--primary`, `--background`, `--card`, etc.) don't match — motion has its own
  darker/purple palette. Copying a component's markup alone will render correct
  *structure* but wrong *colors* until the token values are reconciled too. Out of
  scope for this pass — flagging so colors don't look "off" after a copy.
- **CSS-driven animation (`animate-pulse`, `animate-ping`, `animate-in`/`animate-out`).**
  `skeleton.tsx`, `live-indicator.tsx`, and the Radix open/close transitions
  (`sheet.tsx`, `tooltip.tsx`, `dropdown-menu.tsx`) all animate via Tailwind's
  real-clock CSS keyframes, not Remotion's frame clock. Fine for a single still frame;
  if you need a specific animated moment to render identically every time (e.g. a
  precise mid-pulse frame for a loop), that has to be re-driven off
  `useCurrentFrame()`/`interpolate()` in the motion repo rather than relying on the
  CSS animation timing.

## Not applicable to a rendered video — skip

- `form.tsx` — react-hook-form form-field scaffolding; no live validation in a video.
  webbysalespro-motion doesn't have `react-hook-form` as a dependency either.
- `asset-picker-sheet.tsx` — an admin control (search + pick from a list), not a
  visual element a video would show.
- `theme-provider.tsx` / `theme.tsx` — wrap `next-themes` for runtime light/dark
  toggling. A video isn't toggled at runtime; pick the palette once per composition
  by setting the CSS variables directly instead of porting the toggle mechanism.
  webbysalespro-motion doesn't have `next-themes` as a dependency.

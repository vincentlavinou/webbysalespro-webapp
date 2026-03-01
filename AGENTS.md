# Repository Guidelines

## Project Structure & Module Organization
- Next.js app routes live in `src/app` with route groups `(public)` for marketing and `(webinar)` for attendee tooling; streaming helpers extend into `src/webinar`, `src/video-injection`, `src/media`, and `src/chat`.
- Shared UI primitives and hooks belong in `src/components` and `src/lib`; integrations (offers, payments, storage, emitter) stay under their top-level folders for quick ownership.
- Assets live in `public/`; `npm install` copies Amazon IVS player resources into `public/ivs`. Sanity Studio plus schemas sit inside `/sanity`.

## Build, Test, and Development Commands
- `npm run dev` – launch the Next dev server using `.env.local` for IVS, Stripe, and Sanity keys.
- `npm run build` – type-check and compile the app and Sanity client; use this before tagging releases.
- `npm run start` – serve the optimized production build.
- `npm run lint` – enforce the ESLint + Next ruleset (accessibility, hooks, Tailwind ordering).
- `npm install` – installs dependencies and repopulates `public/ivs`; rerun after upgrading `amazon-ivs-player`.

## Coding Style & Naming Conventions
- Write TypeScript, functional React components, and hooks; keep server components under `src/app` entries and client-only widgets in `src/components`.
- Keep two-space indentation and order Tailwind classes layout → spacing → color.
- Use kebab-case for route directories (`src/app/(public)/privacy-policy/page.tsx`) and camelCase for utilities (`src/lib/useWebinar.ts`).
- Run `npm run lint` before commits; address unused exports or `use client` boundaries the linter flags.

## Testing Guidelines
- Co-locate unit tests as `*.test.tsx` files next to the component or feature they verify (e.g., `src/webinar/player.test.tsx`).
- Until automation lands, record manual broadcast/chat smoke steps inside each PR.
- Future end-to-end suites should target Playwright in `tests/e2e` with fixtures stored in `tests/fixtures`.

## Commit & Pull Request Guidelines
- Mirror the imperative commit style (`update video injection to resume playback`).
- Keep commits focused on one behavior and squash noisy WIP work before merging.
- PRs must explain context, affected modules, and proof of testing (lint output, screenshots, manual steps), plus link Jira/GitHub issues when available.
- Attach screenshots or short clips for UI or streaming changes and list any new env vars or migrations.

## Security & Configuration Tips
- Never commit `.env.local`; reference variable names instead of values.
- Rotate Amazon IVS, Stripe, or Sanity credentials immediately if logged; verify them before `npm run dev`.
- Coordinate schema edits under `/sanity` with the content team so Studio deployments and the web app stay in sync.

# Webinar Join Load Test Plan

## Goal
- Pressure test the attendee join path for three branches:
  - `early-access-room`
  - `waiting-room`
  - `live`
- Validate both initial join throughput and sustained room occupancy behavior.

## Scope
- This covers the attendee flow that starts from a join URL containing `t` and `webinar_id`.
- This does not cover host/presenter flows.
- This separates:
  - critical join admission endpoints
  - room bootstrap endpoints
  - ongoing presence, realtime, playback, and chat endpoints

## Entry Flow
1. Attendee opens `GET /join/live?t=...&webinar_id=...`
2. App resolves the join token through `GET /v2/join/resolve?t=...`
3. If the resolved session is `scheduled`, the app reads `GET /v1/webinars/:webinarId/public/`
4. App redirects to one of:
   - `/:sessionId/early-access-room`
   - `/:sessionId/waiting-room`
   - `/:sessionId/live`

## Critical Endpoints
- `GET /v2/join/resolve`
- `GET /v1/webinars/:webinarId/public/`
- `GET /v1/sessions/:sessionId/attendee-hydrate/`
- `POST /v1/broadcast/token/`
- `GET /v2/realtime/config`
- `POST /v2/realtime/auth`
- `GET /v1/sessions/events/?channels=...&token=...`
- `POST /v2/attendances/:attendanceId/events/`
- `POST /v1/attendee/broadcast/token/`
- `GET /v1/sessions/:sessionId/webinar/`
- `GET /v1/sessions/:sessionId/chat/`
- `POST /v1/chat/token/`
- `POST /v2/join/session/refresh`

## Branch: Early Access Room
### Request order
1. `GET /join/live?t=...&webinar_id=...`
2. `GET /v2/join/resolve?t=...`
3. `GET /v1/webinars/:webinarId/public/`
4. Redirect to `/:sessionId/early-access-room`
5. `GET /v1/sessions/:sessionId/attendee-hydrate/`
6. `POST /v1/broadcast/token/`
7. `GET /v2/realtime/config`
8. Realtime transport:
   - `POST /v2/realtime/auth` when Pusher is enabled
   - or `GET /v1/sessions/events/?channels=...&token=...` when SSE is used
9. `POST /v2/attendances/:attendanceId/events/` with `early_access_room`

### Transition to live
- When the session flips to `in_progress`, the room may call `POST /v1/broadcast/token/` again before redirecting to `/:sessionId/live?ready=1`.

### Load focus
- Join admission burst before the waiting room window opens
- Realtime subscription fanout while users idle
- Transition spike when many early-access users are redirected live at once

## Branch: Waiting Room
### Request order
1. `GET /join/live?t=...&webinar_id=...`
2. `GET /v2/join/resolve?t=...`
3. `GET /v1/webinars/:webinarId/public/`
4. Redirect to `/:sessionId/waiting-room`
5. `GET /v1/sessions/:sessionId/attendee-hydrate/`
6. `POST /v1/broadcast/token/`
7. `GET /v2/realtime/config`
8. Realtime transport:
   - `POST /v2/realtime/auth` when Pusher is enabled
   - or `GET /v1/sessions/events/?channels=...&token=...` when SSE is used
9. `POST /v2/attendances/:attendanceId/events/` with `waiting_room_entered`

### Ongoing waiting-room traffic
- `POST /v2/attendances/:attendanceId/events/` heartbeat every 30 seconds
- `POST /v2/attendances/:attendanceId/events/` with `waiting_room_left` on hide/pagehide
- `POST /v2/attendances/:attendanceId/events/` with `waiting_room_entered` again on return

### Transition to live
- Same live-transition pattern as early access:
  - session update arrives through realtime
  - `POST /v1/broadcast/token/` may be reissued
  - browser redirects to `/:sessionId/live?ready=1`

### Load focus
- Larger concurrency than early access in the final minutes before go-live
- Sustained presence event write volume
- Live cutover surge

## Branch: Live
### Request order when user lands directly in live
1. `GET /join/live?t=...&webinar_id=...`
2. `GET /v2/join/resolve?t=...`
3. Redirect to `/:sessionId/live`
4. `GET /v1/sessions/:sessionId/attendee-hydrate/`
5. `GET /v1/sessions/:sessionId/webinar/`
6. Client bootstrap also loads:
   - `GET /v1/sessions/:sessionId/attendee-hydrate/`
   - `POST /v1/broadcast/token/`
   - `POST /v1/attendee/broadcast/token/`
7. `POST /v2/attendances/:attendanceId/events/` with `live_joined`
8. `POST /v2/attendances/:attendanceId/events/` with `live_watching` once playback starts
9. If chat is enabled:
   - `GET /v1/sessions/:sessionId/chat/`
   - `POST /v1/chat/token/`

### Ongoing live traffic
- `POST /v2/attendances/:attendanceId/events/` heartbeat when playback remains active but idle
- `POST /v2/attendances/:attendanceId/events/` with `live_left`
- `POST /v2/attendances/:attendanceId/events/` with `reentered`
- `POST /v2/join/session/refresh` when join session token is near expiry or auth fails during refresh flows

### Load focus
- Broadcast token issuance
- Playback token issuance
- Presence writes during active viewing
- Chat bootstrap and token issuance

## Recommended Load-Test Order
1. `GET /v2/join/resolve`
2. `GET /v1/webinars/:webinarId/public/` for scheduled-session scenarios
3. `GET /v1/sessions/:sessionId/attendee-hydrate/`
4. `POST /v1/broadcast/token/`
5. `GET /v2/realtime/config`
6. `POST /v2/realtime/auth` or SSE connect to `GET /v1/sessions/events/...`
7. `POST /v2/attendances/:attendanceId/events/`
8. `POST /v1/attendee/broadcast/token/`
9. `GET /v1/sessions/:sessionId/chat/` and `POST /v1/chat/token/` if chat is in scope
10. `POST /v2/join/session/refresh`

## Test Phases
### Phase 1: Join Admission
- Simulate a burst of unique join tokens hitting:
  - `GET /join/live`
  - `GET /v2/join/resolve`
- Goal:
  - verify token resolution latency
  - verify redirect success rate
  - verify app behavior under distinct-token concurrency

### Phase 2: Holding Room Bootstrap
- Split traffic into early access and waiting room populations.
- Validate:
  - attendee hydrate throughput
  - broadcast token issuance throughput
  - realtime subscription establishment rate
  - first presence-event write success

### Phase 3: Holding Pattern
- Keep users resident in early access and waiting room.
- Validate:
  - steady-state realtime connections
  - waiting-room heartbeat volume
  - reconnect and tab-visibility churn

### Phase 4: Go-Live Cutover
- Transition a large holding-room population to live together.
- Validate:
  - session update propagation
  - secondary broadcast token issuance
  - attendee playback token issuance
  - live page boot success

### Phase 5: Active Live Session
- Keep users connected in live.
- Validate:
  - playback token stability
  - presence event volume
  - chat bootstrap and token issuance
  - token refresh behavior

## Suggested Scenario Matrix
- Scenario A: Many users join 30+ minutes early and remain in early access
- Scenario B: Many users join inside the waiting-room window and remain idle
- Scenario C: Many users hit the join link exactly at scheduled start and go straight to live
- Scenario D: A large early-access or waiting-room population is cut over to live at once
- Scenario E: Live users with chat enabled
- Scenario F: Users background and refocus tabs during waiting and live states

## Notes
- `GET /v2/join/resolve` is deduplicated in-process for 15 seconds for identical raw tokens, but distinct tokens still fully load the backend.
- Waiting-room and live traffic should be measured separately because the presence and playback load profiles are different.
- If realtime is configured for Pusher, load should include auth fanout to `POST /v2/realtime/auth`.
- If realtime falls back to SSE, load should include long-lived open connections to `GET /v1/sessions/events/...`.

## Code References
- Join route: `src/app/(webinar)/join/live/route.ts`
- Join resolve: `src/attendee-session/service/resolve-join.ts`
- Attendee session refresh: `src/attendee-session/service/action.ts`
- Webinar bootstrap and realtime: `src/webinar/providers/WebinarProvider.tsx`
- Waiting and early access UI: `src/webinar/components/HoldingRoomPage.tsx`
- Presence events: `src/broadcast/hooks/use-session-presence.tsx`
- Live page bootstrap: `src/app/(webinar)/[id]/live/page.tsx`
- Playback token bootstrap: `src/playback/components/PlaybackContainer.tsx`
- Chat bootstrap: `src/chat/ChatManager.tsx`

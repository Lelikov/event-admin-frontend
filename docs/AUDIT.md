# event-admin-frontend Audit Findings

Audited: 2026-04-20

---

## CRITICAL

---

[CRITICAL] getUserById calls wrong URL — broken endpoint in production

Services affected: event-admin-frontend, event-users
Location: `event-admin-frontend/src/modules/participants/participantsApi.ts:57`
Description: The frontend calls `GET /api/users/${encodeURIComponent(id)}` to fetch a single user by ID. The actual event-users backend exposes this resource at `GET /api/users/id/{user_id}` (see `event-users/event_users/routes.py:82`). This means every `UserInfo` component in the app (used in BookingDetailsPage, BookingsPage, DashboardPage) silently falls back to showing a truncated UUID instead of the user's email, because the error is caught and swallowed. The feature is effectively non-functional.
Recommendation: Change the call in `participantsApi.ts:57` to `return usersApiRequest<UserItem>(\`/api/users/id/${encodeURIComponent(id)}\`)`.

---

[CRITICAL] VITE_USERS_API_TOKEN referenced in docs but absent from code — authentication gap or stale docs

Services affected: event-admin-frontend, event-users
Location: `event-admin-frontend/CLAUDE.md:42,52`; `event-admin-frontend/src/modules/participants/participantsApi.ts:42-44`
Description: The CLAUDE.md documentation states that requests to event-users use `VITE_USERS_API_TOKEN` (a static bearer token). However the actual `usersApiRequest` implementation delegates to the standard `apiRequest()` wrapper, which attaches the user's own JWT from localStorage (`auth: true` by default). There is no static token in the code at all. One of two problems exists: (a) the static token was removed and the docs are stale — fine for now, but the architecture was previously designed to embed a secret into the bundle (a critical exposure risk); or (b) the intent was to use a static service token and it was accidentally never wired up, meaning calls to event-users carry the admin user's JWT rather than a dedicated service identity. Either way, the discrepancy must be resolved with a clear decision.
Recommendation: Confirm the intended auth model. If user JWT forwarding is intentional, remove all references to `VITE_USERS_API_TOKEN` from documentation. If a static service token is still intended, do NOT embed it in a VITE_ variable (it would be baked into the production JS bundle and visible to anyone); proxy the calls through event-admin instead.

---

## HIGH

---

[HIGH] JWT stored in localStorage — XSS exfiltration risk

Services affected: event-admin-frontend
Location: `event-admin-frontend/src/modules/auth/storage.ts:1-26`
Description: The JWT (key `event_admin_jwt`) and role (key `event_admin_role`) are persisted in `localStorage`. Any XSS vulnerability — including a compromised npm dependency — can read and exfiltrate these values, enabling full session hijacking. This is a known, documented anti-pattern for admin interfaces handling sensitive data.
Recommendation: For an admin-only tool, prefer `httpOnly` session cookies managed by the backend. If localStorage must be used (e.g. to support SPA-only deployment), document the decision explicitly and ensure strict CSP headers are in place to limit XSS surface. At minimum, implement short JWT expiry (already present via `jwt_expire_minutes`) and do not store role in localStorage separately since it is derivable from the JWT payload.

---

[HIGH] JWT expiry not handled client-side — silent failures mid-session

Services affected: event-admin-frontend
Location: `event-admin-frontend/src/modules/shared/api.ts:55-61`; `event-admin-frontend/src/modules/auth/AuthContext.tsx:37-50`
Description: When the JWT expires mid-session, the backend returns HTTP 401 with `{"detail": "Token expired"}`. The `apiRequest` function throws an `ApiError` with status 401. However, there is no global 401 interceptor: each page-level component catches the error and renders a generic error message (e.g. "Не удалось загрузить бронирования"). The user remains on the page with a stale localStorage token and a misleading error. They are never automatically redirected to `/login` and the stored token is never cleared. A user could remain stuck indefinitely.
Recommendation: Add a 401-interceptor in `apiRequest` (or a context-level handler): when `ApiError.status === 401`, call `logout()` from `AuthContext` and redirect to `/login`. This pattern is idiomatic for SPAs with JWT auth.

---

[HIGH] RBAC enforced only client-side for the /participants route

Services affected: event-admin-frontend, event-users
Location: `event-admin-frontend/src/App.tsx:41-43`; `event-admin-frontend/src/modules/app/AdminLayout.tsx:120`
Description: The frontend hides the "Пользователи" nav item and redirects non-admin users away from `/participants` in a `useEffect`. This is client-side enforcement only and can be bypassed by any user who (1) manually navigates to the URL, (2) opens DevTools and changes the `event_admin_role` value in localStorage, or (3) holds a valid JWT with `role: "user"`. The backend event-users service has `require_admin` on write endpoints but NOT on the read endpoints `GET /api/users` and `GET /api/users/id/{user_id}` (see `event-users/event_users/routes.py:67,82,93`) — any authenticated JWT can call them.
Recommendation: Enforce read access to user list and user-by-id endpoints server-side in event-users, or proxy those calls through event-admin where the requester's role can be verified. Document explicitly that the current design is intentionally open to all authenticated users (if that is the intent).

---

## MEDIUM

---

[MEDIUM] getBookingDetails silently retries on 404 — logic bug

Services affected: event-admin-frontend, event-admin
Location: `event-admin-frontend/src/modules/bookings/bookingsApi.ts:33-40`
Description: When `GET /bookings/{uid}` returns 404, the code catches the error and immediately retries the identical request. A 404 from the backend is deterministic (the booking does not exist); retrying it will always produce another 404. The retry is dead code that adds latency (two requests, two 404 responses) and masks the likely original intent (e.g. a retry after a different error, or a commented-out fallback to a different endpoint).
Recommendation: Remove the catch block's retry. Propagate the 404 `ApiError` directly; `BookingDetailsPage` already handles the error state correctly.

---

[MEDIUM] UserInfo fires one HTTP request per user per render — N+1 problem

Services affected: event-admin-frontend, event-users
Location: `event-admin-frontend/src/modules/shared/UserInfo.tsx:13-30`
Description: `UserInfo` is a component that fires `GET /api/users/id/{userId}` in a `useEffect` every time it mounts. The `BookingDetailsPage` renders multiple `UserInfo` instances (organizer, client, one per email notification, per telegram notification, per meeting link, per chat event). If a booking has 10 notifications, 10 separate HTTP requests are made to event-users on page load, with no deduplication, caching, or batching.
Recommendation: Introduce a simple client-side memo/cache keyed by `userId` (a `useRef` Map at context level, or React Query / SWR) so that repeated lookups for the same user ID resolve from cache without network round-trips.

---

[MEDIUM] Dev bypass login state hardcodes role as "admin" — elevated privilege risk

Services affected: event-admin-frontend
Location: `event-admin-frontend/src/modules/auth/LoginPage.tsx:98`
Description: When dev bypass is triggered, `loginWithToken(DEV_BYPASS_JWT, 'admin')` is called — the role is hardcoded to `'admin'` regardless of what the `VITE_DEV_BYPASS_JWT` token actually contains. If a developer accidentally has `VITE_ENABLE_DEV_BYPASS_LOGIN=true` in a staging `.env`, anyone with UI access gets admin role client-side. The server will still reject admin-only backend calls if the JWT does not carry `role: admin`, but client-side RBAC (nav visibility, route guards) will be fully bypassed.
Recommendation: Either remove the hardcoded `'admin'` and decode the role from `VITE_DEV_BYPASS_JWT`'s payload, or add a guard that prevents the dev bypass button from appearing unless `import.meta.env.MODE === 'development'`.

---

[MEDIUM] VITE_ENABLE_DEV_BYPASS_LOGIN relies on string comparison without MODE guard

Services affected: event-admin-frontend
Location: `event-admin-frontend/src/modules/auth/LoginPage.tsx:7`
Description: The dev bypass is enabled by checking `import.meta.env.VITE_ENABLE_DEV_BYPASS_LOGIN === 'true'`. Vite bakes `VITE_*` variables at build time. If someone sets this variable in a production `.env` (or CI/CD injects it) the bypass button ships to production. There is no `import.meta.env.DEV` or `MODE !== 'production'` guard.
Recommendation: Wrap the bypass in `import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_BYPASS_LOGIN === 'true'`. The `DEV` flag is false in production Vite builds and cannot be overridden by a `.env` file.

---

[MEDIUM] ParticipantPicker fires API request on every focus event — unnecessary load

Services affected: event-admin-frontend, event-users
Location: `event-admin-frontend/src/modules/shared/ParticipantPicker.tsx:53-57`
Description: `handleFocus` calls `fetchResults(query)` unconditionally whenever the input receives focus. If a user clicks in and out of the picker multiple times without typing, the same query is fired repeatedly. Combined with the N+1 issue in UserInfo, this can create a burst of requests to event-users.
Recommendation: Guard the focus fetch: only trigger if the current results are empty (first open) or if the query has changed since the last fetch.

---

[MEDIUM] No pagination on BookingsPage — unbounded response size

Services affected: event-admin-frontend, event-admin
Location: `event-admin-frontend/src/modules/bookings/BookingsPage.tsx:28-31`; `event-admin/event_admin/routes.py:61-76`
Description: `GET /bookings` returns `list[BookingListItemResponse]` — an array with no pagination parameters. The frontend fetches and renders all bookings in one request. For a growing dataset this will become a slow query, a large JSON payload, and a sluggish DOM table. The event-admin backend currently has no `limit`/`offset` parameters on this endpoint.
Recommendation: Add server-side pagination to `GET /bookings` (limit/offset or cursor-based), and update BookingsPage to handle paged results as ParticipantsPage already does.

---

## LOW

---

[LOW] Role stored redundantly in localStorage separate from JWT

Services affected: event-admin-frontend
Location: `event-admin-frontend/src/modules/auth/storage.ts:16-26`; `event-admin-frontend/src/modules/auth/AuthContext.tsx:31-34`
Description: The `role` is stored in `localStorage` as a separate key (`event_admin_role`) in addition to being encoded in the JWT (`role` claim). A malicious or confused mutation of the localStorage key can cause the client to render a different role than what the JWT actually carries — leading to UI mismatch (e.g., seeing admin nav but receiving 403 from the backend).
Recommendation: Derive the role from the decoded JWT payload on page load rather than storing it as a separate key. The JWT is already stored in localStorage; its payload is readable without a secret.

---

[LOW] No fallback for unknown route — not-found renders inside AdminLayout

Services affected: event-admin-frontend
Location: `event-admin-frontend/src/App.tsx:58-63`; `event-admin-frontend/src/modules/shared/routing.ts:31`
Description: `parseRoute` returns `{ name: 'not-found' }` for all unrecognised paths. App.tsx renders a "Страница не найдена" div inside `AdminLayout`, which requires the user to be authenticated. If an unauthenticated user navigates to an unknown URL, they are first redirected to `/login` (correct), but authenticated users visiting junk URLs get a functional page with full sidebar rather than a clear 404 experience.
Recommendation: Acceptable for an internal tool. Consider returning a standalone 404 page outside AdminLayout for clarity, or adding the current path to the not-found message to aid debugging.

---

[LOW] format.ts passes invalid timeZone to Intl.DateTimeFormat without guard

Services affected: event-admin-frontend
Location: `event-admin-frontend/src/modules/shared/format.ts:8-12`
Description: `formatDateTime` passes the user-supplied `timeZone` string directly to `Intl.DateTimeFormat`. If `TimeZoneContext` somehow returns a malformed value (e.g. user corrupts localStorage manually), this throws a `RangeError: Invalid time zone` which is not caught.
Recommendation: Wrap the `Intl.DateTimeFormat` call in a try/catch and fall back to UTC on error. Alternatively, validate the timezone on set in `TimeZoneContext`.

---

[LOW] No .env.example file — onboarding gap

Services affected: event-admin-frontend
Location: `event-admin-frontend/` (project root)
Description: The CLAUDE.md lists four env variables (`VITE_API_BASE_URL`, `VITE_USERS_API_BASE_URL`, `VITE_ENABLE_DEV_BYPASS_LOGIN`, `VITE_DEV_BYPASS_JWT`) but there is no `.env.example` file. New developers must read the documentation to find all required variables, and there is no validation that these are set before the app starts.
Recommendation: Add an `.env.example` with placeholder values. Optionally add a startup check that warns if `VITE_API_BASE_URL` or `VITE_USERS_API_BASE_URL` are empty strings.

---

[LOW] No test coverage

Services affected: event-admin-frontend
Location: entire `src/`
Description: No test runner is configured. Zero unit or integration tests exist. While noted as pre-production, the complete absence of tests means that the API contract mismatch (`getUserById` wrong URL), the 404 retry bug, and the dev bypass role hardcoding could all have been caught automatically.
Recommendation: At minimum, add Vitest + React Testing Library and cover: (a) `parseRoute` routing logic, (b) `apiRequest` error handling including 401, (c) `usersApiRequest` URL construction. These are low-effort, high-value tests.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH     | 3 |
| MEDIUM   | 5 |
| LOW      | 4 |
| **Total**| **14** |

### Top 3 Concerns

1. **Broken getUserById URL (CRITICAL)** — The frontend calls `GET /api/users/{id}` but the backend expects `GET /api/users/id/{id}`. The UserInfo component, used on every page with participants, is silently non-functional. Users always see truncated UUIDs instead of email addresses.

2. **No JWT expiry handling (HIGH)** — A 401 from the backend does not clear the session or redirect to login. Mid-session token expiry leaves users with a broken UI and a stale token in localStorage indefinitely.

3. **Client-only RBAC for participants access (HIGH)** — Role enforcement for the users/participants page is applied only in the browser. The backend read endpoints in event-users are accessible to any authenticated JWT regardless of role, making the server-side access control incomplete.

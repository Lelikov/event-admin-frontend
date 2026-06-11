# event-admin-frontend Audit

Audit v2: 2026-06-10 (findings) / 2026-06-11 (fix pass, branch `audit-fixes`)
Previous audit: 2026-04-20 (all findings re-verified in v2; superseded by this document)

Status legend: **FIXED** (resolved in this pass), **ACCEPTED** (documented residual risk), **FOLLOW-UP** (requires another service).

---

## HIGH

### 1. Global 401 interceptor fired on failed login -- error never shown — FIXED

`apiRequest` cleared storage and hard-navigated to `/login` for ANY 401, including the response of `POST /auth/login` itself, reloading the page before the "invalid credentials" error could render. The redirect now happens only when a JWT was actually attached to the request; storage is cleared via `storage.ts` helpers instead of hardcoded keys. Login errors are translated (401 invalid credentials, 429 throttling). Covered by unit tests in `api.test.ts`.

### 2. Bookings list silently truncated at 50 rows — FIXED

The backend gained `limit`/`offset` (default 50, max 500) but the frontend sent neither and had no paging UI, so rows past 50 were invisible. `getBookings` now sends explicit `limit=50`/`offset`, and `BookingsPage` has prev/next paging (the endpoint returns no total, so "next" is enabled while a full page came back).

### 3. JWT persisted in localStorage (XSS exfiltration) — FIXED (mitigated) / ACCEPTED (residual)

The token moved from localStorage to **sessionStorage** (tab-scoped, dropped on tab close); legacy localStorage keys are cleared on load; tokens expire after 60 minutes and the 401 interceptor forces re-login; `AuthProvider` drops already-expired tokens at startup. **Accepted residual risk**: the token is still JS-readable. event-admin offers no refresh endpoint and no httpOnly-cookie session, so an in-memory-only token would force a re-login (password + TOTP) on every reload — disproportionate for an internal admin tool. Long-term fix: httpOnly session cookies in event-admin. A CSP should be added at the hosting layer (a meta CSP breaks Vite dev HMR), which is a deployment concern.

---

## MEDIUM

### 4. Role model contract drift (backend admin-only vs frontend two-role UI) — FIXED

event-admin requires `role="admin"` on every data endpoint, so the frontend's `user` role handling (participants route gate, adminOnly nav item, role badge, `event_admin_role` storage) was dead code producing raw "Admin access required" errors. All client-side role branching and role storage were removed; the role remains a JWT claim decodable via `auth/jwt.ts`.

### 5. userBatchLoader cache never invalidated; unknown ids re-requested — FIXED

Added `invalidateUser`/`clearUserCache`, negative caching of ids missing from `/api/users/by-ids`, and a version-counter subscription consumed by `UserInfo` via `useSyncExternalStore`. `EmailChangeModal` invalidates the affected user on success (email change and reassign), and the cache is cleared on logout. Covered by unit tests.

### 6. Vite dev proxy routed /api/users directly to event-users — FIXED

The `/api/users -> VITE_USERS_API_BASE_URL` proxy rule bypassed event-admin's RBAC proxy in dev (or was dead config when `VITE_API_BASE_URL` was set). The dev proxy now forwards `/api`, `/auth`, `/bookings`, `/health` to event-admin only; `VITE_USERS_API_BASE_URL` is removed.

---

## LOW

### 7. CLAUDE.md documented VITE_USERS_API_TOKEN / usersApiRequest (removed code) — FIXED

CLAUDE.md, README, and docs now describe the event-admin proxy model; all references to the static token, `usersApiRequest`, and `VITE_USERS_API_BASE_URL` are gone (including the `'yl` header typo).

### 8. Service docs described pre-fix architecture — FIXED

SERVICE_OVERVIEW, API_CONTRACTS, DEPENDENCIES regenerated from current code; they now document `POST /api/users/by-ids`, the email-change/changelog endpoints, `POST /bookings/{uid}/reassign-client`, and the EmailChangeModal flow. README's never-implemented "proposed auth contract" section was deleted.

### 9. formatDateTime crashed the app on invalid stored timezone — FIXED

`TimeZoneProvider` validates the stored zone with a probe `Intl.DateTimeFormat` (removing corrupt values), `formatDateTime` falls back to the default zone on `RangeError`, and `main.tsx` now wraps the app in an `ErrorBoundary` so any remaining render error shows a recoverable card instead of a white screen.

### 10. Role stored redundantly in localStorage — FIXED

Removed entirely with the role model cleanup (finding 4); `event_admin_role` is also deleted from old browsers on load.

### 11. Dev bypass crashed when VITE_DEV_BYPASS_JWT unset / not base64url-safe — FIXED

The bypass button renders only when `import.meta.env.DEV`, the flag, AND a non-empty `VITE_DEV_BYPASS_JWT` are all set; the unguarded `atob/JSON.parse` is gone (role decoding became unnecessary), and the new `decodeJwtPayload` helper is base64url-safe and null-safe (unit-tested).

### 12. npm run lint failed with 3 errors — FIXED

`UserInfo` no longer calls setState synchronously in an effect (cache is read during render via `useSyncExternalStore`); `useAuth`/`useTimeZone` hooks moved to their own files (`auth/useAuth.ts`, `settings/useTimeZone.ts`) so context files export only components. Lint is green.

### 13. Error translation keyed on backend prose strings — FOLLOW-UP (event-admin) / mitigated

The missing translation for `Client with this email not found` was added and the coupling is documented at the map definition. Proper fix requires event-admin to return machine-readable error codes (e.g. `detail: {code: "email_in_use"}`) — cross-service follow-up.

### 14. bookingUid not URL-encoded in reassignBookingClient — FIXED

`encodeURIComponent` applied, consistent with all other `/bookings/{uid}` calls.

### 15. Duplicated booking-details load logic — FIXED

The standalone `loadBookingDetails` copy was removed; the single load effect re-runs via a reload counter bumped by the email-change modal's `onSuccess`.

### 16. Dead code: public/env-config.js + stray nested build dir — FIXED

`public/env-config.js` (unreferenced `window._env_` stub) deleted from git; the stray nested `event-admin-frontend/` directory removed from disk (already gitignored).

### 17. else-if chain / nested ternaries vs no-elif convention — FIXED

`ParticipantPicker.handleKeyDown` uses early returns; `BookingDetailsPage` access title/icon double ternaries replaced with `Record` mapping objects.

### 18. No .env.example, no env validation — FIXED

`.env.example` added (`VITE_API_BASE_URL`, `VITE_ENABLE_DEV_BYPASS_LOGIN`, `VITE_DEV_BYPASS_JWT`); `api.ts` warns at startup when `VITE_API_BASE_URL` is empty in production builds.

### 19. Pseudo-404 without context — FIXED

The not-found view shows the offending pathname and a "back to dashboard" button.

### 20. Zero test coverage — FIXED (baseline)

Vitest (happy-dom) bootstrapped with 27 tests over the seams that produced repeated regressions: `apiRequest` (401 login vs authenticated, session clearing, detail extraction, 204, 429), `decodeJwtPayload`/`isTokenExpired`, `parseRoute`, `formatDateTime` fallback, and `userBatchLoader` batching/caching/negative-caching/invalidation/failure. Component-level tests (React Testing Library) remain a follow-up.

---

## April 2026 findings already fixed before this pass (verified)

- `getUserById` wrong URL (`/api/users/{id}`): the call no longer exists; lookups use `POST /api/users/by-ids` via the event-admin proxy.
- `getBookingDetails` silent retry on 404: removed.
- UserInfo N+1 HTTP requests: replaced by the microtask batch loader.
- ParticipantPicker fetch on focus: opens-only fetch with 300 ms input debounce.
- Dev bypass without MODE guard / hardcoded admin role: guarded by `import.meta.env.DEV` (hardened further in this pass, finding 11).

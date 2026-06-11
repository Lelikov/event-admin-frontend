# event-admin-frontend -- Service Overview

Last updated: 2026-06-11 (audit-v2 fix pass)

## Domain

Admin UI (Single-Page Application) for viewing bookings and managing participant emails. All backend traffic goes to **event-admin only**: event-admin authenticates requests, enforces admin RBAC, and proxies `/api/users/*` to event-users itself. The frontend never talks to event-users directly.

## Module Structure

All application code lives under `src/modules/`:

| Module | Purpose | Key Files |
|--------|---------|-----------|
| `auth/` | Login page, AuthProvider (JWT state, sessionStorage persistence), JWT payload decoding, `/auth/*` API calls | `AuthContext.tsx`, `context.ts`, `useAuth.ts`, `jwt.ts`, `LoginPage.tsx`, `authApi.ts`, `storage.ts`, `types.ts` |
| `bookings/` | Dashboard, paged bookings list, booking detail pages; API calls and types | `DashboardPage.tsx`, `BookingsPage.tsx`, `BookingDetailsPage.tsx`, `bookingsApi.ts`, `types.ts`, `statuses.ts` |
| `participants/` | Users list page, email-change/reassign modal, users + email-change API wrappers | `ParticipantsPage.tsx`, `participantsApi.ts`, `EmailChangeModal.tsx`, `emailChangeApi.ts` |
| `settings/` | TimeZone provider -- persists validated timezone to localStorage (`event_admin_time_zone`) | `TimeZoneContext.tsx`, `context.ts`, `useTimeZone.ts` |
| `app/` | AdminLayout -- sidebar navigation + page shell wrapping authenticated content | `AdminLayout.tsx` |
| `shared/` | `apiRequest` fetch wrapper with 401 interceptor, `formatDateTime`, manual routing, batched user loader with cache invalidation, `ErrorBoundary`, reusable components | `api.ts`, `routing.ts`, `format.ts`, `userBatchLoader.ts`, `UserInfo.tsx`, `ErrorBoundary.tsx`, `ParticipantPicker.tsx`, `StatusFilter.tsx` |

Entry point: `src/main.tsx` renders `<App />` wrapped in `ErrorBoundary`, `TimeZoneProvider` and `AuthProvider`.

## Routing

Manual implementation in `src/modules/shared/routing.ts` -- no router library.

| Path | Route Name | Component | Auth Required |
|------|-----------|-----------|---------------|
| `/login` | `login` | `LoginPage` | No |
| `/` or `/dashboard` | `dashboard` | `DashboardPage` | Yes |
| `/bookings` | `bookings` | `BookingsPage` (paged, 50/page) | Yes |
| `/bookings/:uid` | `booking-details` | `BookingDetailsPage` | Yes |
| `/participants` | `participants` | `ParticipantsPage` (paged, 50/page) | Yes |
| (anything else) | `not-found` | 404 card showing the offending path | Yes |

Mechanics:
- `parseRoute(pathname)` returns a discriminated union `AppRoute`
- `navigateTo(path, { replace? })` calls `history.pushState`/`replaceState` and dispatches a custom `app:navigate` event on `window`
- `App.tsx` listens to `popstate` + `app:navigate` to re-render

## Auth Flow

1. User submits `email + password + totp_code` on `/login`
2. `authApi.ts` sends `POST /auth/login` to event-admin (no auth header)
3. Response: `{ access_token, token_type: "Bearer", role }`. Tokens live **60 minutes** (`jwt_expire_minutes` in event-admin). 401 -> "invalid credentials" message; 429 -> "too many attempts" message (login throttling)
4. `loginWithToken()` stores the JWT under `event_admin_jwt` in **sessionStorage** (tab-scoped). The role is NOT stored separately -- it is a JWT claim, decodable via `auth/jwt.ts` if ever needed
5. Subsequent API requests attach `Authorization: Bearer <token>`
6. On any 401 response to a request that carried a token, `apiRequest` clears the session and redirects to `/login`. On app load, `AuthProvider` drops tokens whose `exp` claim already passed

Logout: calls `POST /auth/logout` (best-effort), clears the token and the user cache.

## Role Model

There is **no client-side role branching**. event-admin attaches `require_admin` to every data endpoint, so only `role="admin"` tokens can use the app at all; the previous two-role model (`user` blocked from `/participants` only) was dead code and was removed in audit-v2.

## User Lookup & Caching

`shared/userBatchLoader.ts` batches all `UserInfo` lookups within a microtask into a single `POST /api/users/by-ids` call and caches results for the SPA session, including **negative caching** of unknown ids. `invalidateUser(id)` / `clearUserCache()` drop entries (used after email change/reassign and on logout); `UserInfo` subscribes via `useSyncExternalStore` and re-fetches automatically after invalidation.

## Environment Variables

Defined at build time via Vite (`import.meta.env.VITE_*`). See `.env.example`.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes (warned if empty in prod builds) | event-admin backend base URL. The ONLY backend URL the app uses |
| `VITE_ENABLE_DEV_BYPASS_LOGIN` | No | `"true"` to show dev login button (dev builds only) |
| `VITE_DEV_BYPASS_JWT` | No | JWT used when dev bypass is triggered; button hidden when unset |

The Vite dev server proxies `/api`, `/auth`, `/bookings`, `/health` to `VITE_API_BASE_URL` (event-admin) for relative-URL setups.

## Testing & Quality Gates

- `npm test` -- Vitest (happy-dom): apiRequest 401/429 semantics, JWT decoding/expiry, routing, date formatting, user batch loader batching/caching/invalidation
- `npm run lint` -- ESLint (green)
- `npm run build` -- `tsc -b && vite build` (green)

## Known Limitations (accepted)

| # | Summary | Rationale |
|---|---------|-----------|
| 1 | JWT readable by JS (sessionStorage) | event-admin has no refresh endpoint or httpOnly-cookie session; sessionStorage + 60-min expiry + 401 interceptor narrows the window. Documented accepted risk in `docs/AUDIT.md`; long-term fix is cookie sessions in event-admin |
| 2 | Error translations key on backend prose strings | event-admin returns human-readable `detail` strings; machine-readable error codes are a cross-service follow-up |
| 3 | No CSP configured | CSP belongs in server/deployment headers (a meta CSP breaks Vite dev HMR); add at the hosting layer |
| 4 | Bookings list has no total count | `GET /bookings` returns a bare array; paging uses "full page => maybe more" heuristic |

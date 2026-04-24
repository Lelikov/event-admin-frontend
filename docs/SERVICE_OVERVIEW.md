# event-admin-frontend -- Service Overview

## Domain

Admin UI (Single-Page Application) for viewing and managing bookings and participants. Provides read-only visibility into the event-driven booking system, with user lookup powered by a separate users service.

## Module Structure

All application code lives under `src/modules/`:

| Module | Purpose | Key Files |
|--------|---------|-----------|
| `auth/` | Login page, AuthContext (JWT + role state), localStorage persistence, API calls to event-admin `/auth/*` | `AuthContext.tsx:1-73`, `LoginPage.tsx`, `authApi.ts:1-14`, `storage.ts:1-26`, `types.ts:1-11` |
| `bookings/` | Dashboard, bookings list, booking detail pages; API calls and TypeScript types | `DashboardPage.tsx`, `BookingsPage.tsx`, `BookingDetailsPage.tsx:1-465`, `bookingsApi.ts:1-44`, `types.ts:1-103`, `statuses.ts` |
| `participants/` | Users/participants list page; API wrapper for event-users backend | `ParticipantsPage.tsx`, `participantsApi.ts:1-68` |
| `settings/` | TimeZone context -- persists chosen timezone to localStorage (`event_admin_time_zone`) | `TimeZoneContext.tsx` |
| `app/` | AdminLayout -- sidebar navigation + page shell wrapping authenticated content | `AdminLayout.tsx` |
| `shared/` | Cross-cutting utilities: `apiRequest` fetch wrapper, `formatDateTime` (ru-RU locale), manual routing, reusable components (`UserInfo`, `ParticipantPicker`, `StatusFilter`) | `api.ts:1-64`, `routing.ts:1-38`, `format.ts`, `UserInfo.tsx:1-36`, `ParticipantPicker.tsx`, `StatusFilter.tsx` |

Entry point: `src/main.tsx` renders `<App />` wrapped in `AuthProvider` and `TimeZoneProvider`.  
Top-level router: `src/App.tsx:1-68`.

## Routing

Manual implementation in `src/modules/shared/routing.ts:1-38` -- no router library.

| Path | Route Name | Component | Auth Required | Role |
|------|-----------|-----------|---------------|------|
| `/login` | `login` | `LoginPage` | No | Any |
| `/` or `/dashboard` | `dashboard` | `DashboardPage` | Yes | Any |
| `/bookings` | `bookings` | `BookingsPage` | Yes | Any |
| `/bookings/:uid` | `booking-details` | `BookingDetailsPage` | Yes | Any |
| `/participants` | `participants` | `ParticipantsPage` | Yes | admin only |
| (anything else) | `not-found` | Inline "not found" div | Yes | Any |

Mechanics (`routing.ts:9-38`):
- `parseRoute(pathname)` returns a discriminated union `AppRoute`
- `navigateTo(path, { replace? })` calls `history.pushState`/`replaceState` and dispatches a custom `app:navigate` event on `window`
- `App.tsx:15-24` listens to `popstate` + `app:navigate` to re-render

## Auth Flow

1. User submits `email + password + totp_code` on `/login`
2. `authApi.ts:4-9` sends `POST /auth/login` to event-admin (no auth header)
3. Response: `{ access_token, token_type: "Bearer", role }` (`auth/types.ts:7-11`)
4. `AuthContext.loginWithToken()` stores JWT under `event_admin_jwt` and role under `event_admin_role` in localStorage (`storage.ts:1-26`)
5. App re-renders; `App.tsx:31-34` redirects authenticated user away from `/login` to `/dashboard`
6. Subsequent API requests attach `Authorization: Bearer <token>` via `api.ts:34-38`

Logout (`AuthContext.tsx:37-49`):
- Calls `POST /auth/logout` on event-admin (best-effort)
- Clears localStorage keys regardless of backend response

## Role-Based Access

Two roles: `"admin"` and `"user"`.

| Control Point | Location | Mechanism |
|---------------|----------|-----------|
| `/participants` route guard | `App.tsx:41-43` | `useEffect` redirects non-admin to `/dashboard` |
| Nav item visibility | `AdminLayout.tsx:120` | Conditionally renders "Users" link for admin only |

**Important**: Enforcement is client-side only. The event-users read endpoints (`GET /api/users`, `GET /api/users/id/{id}`) accept any valid JWT regardless of role.

## Environment Variables

Defined at build time via Vite (`import.meta.env.VITE_*`):

| Variable | Required | Description | Reference |
|----------|----------|-------------|-----------|
| `VITE_API_BASE_URL` | Yes | event-admin backend base URL (e.g. `http://localhost:8000`) | `api.ts:3` |
| `VITE_USERS_API_BASE_URL` | Yes | event-users backend base URL (e.g. `http://localhost:8001`) | `participantsApi.ts:3` |
| `VITE_ENABLE_DEV_BYPASS_LOGIN` | No | `"true"` to show dev login button | `LoginPage.tsx:7` |
| `VITE_DEV_BYPASS_JWT` | No | JWT used when dev bypass is triggered | `LoginPage.tsx:98` |

No `.env.example` file exists. No runtime validation of required variables.

## Known Limitations

| ID | Severity | Summary | Location |
|----|----------|---------|----------|
| 1 | CRITICAL | `getUserById` calls wrong URL (`/api/users/{id}` instead of `/api/users/id/{id}`); UserInfo component silently non-functional | `participantsApi.ts:57` |
| 2 | HIGH | No JWT expiry handling -- 401 responses show generic error, no redirect to login, stale token persists | `api.ts:55-61`, `AuthContext.tsx:37-50` |
| 3 | HIGH | No test runner configured; zero test coverage | entire `src/` |
| 4 | HIGH | RBAC for `/participants` is client-side only; event-users read endpoints have no role check | `App.tsx:41-43` |
| 5 | MEDIUM | `getBookingDetails` retries on 404 (deterministic failure) | `bookingsApi.ts:33-40` |
| 6 | MEDIUM | UserInfo fires one HTTP request per user per render (N+1) | `UserInfo.tsx:13-30` |
| 7 | MEDIUM | No pagination on bookings list | `BookingsPage.tsx:28-31` |
| 8 | LOW | Role stored redundantly in localStorage separate from JWT payload | `storage.ts:16-26` |

Full audit: `docs/audit/raw/event-admin-frontend_audit.md`

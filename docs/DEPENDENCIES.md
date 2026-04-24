# event-admin-frontend -- Dependencies

## Runtime Service Dependencies

```
event-admin-frontend
    ├── event-admin   (VITE_API_BASE_URL)
    └── event-users   (VITE_USERS_API_BASE_URL)
```

---

## Dependency: event-admin

| Aspect | Detail |
|--------|--------|
| Base URL config | `VITE_API_BASE_URL` (`src/modules/shared/api.ts:3`) |
| Auth mechanism | Bearer JWT (obtained from event-admin's own `/auth/login`) |
| Endpoints consumed | `POST /auth/login`, `POST /auth/logout`, `GET /bookings`, `GET /bookings/{uid}`, `GET /bookings/future-email-bounced` |

### What breaks if event-admin goes down

| Feature | Impact | User-visible behavior |
|---------|--------|----------------------|
| Login | **Total** -- cannot authenticate | Login form shows error, app unusable |
| Dashboard | **Total** -- `DashboardPage` calls `getFutureEmailBouncedBookings()` + `getBookings()` | "Failed to load" error message |
| Bookings list | **Total** -- `BookingsPage` calls `getBookings()` | Error state rendered |
| Booking details | **Total** -- `BookingDetailsPage` calls `getBookingDetails()` | Error state rendered |
| Logout | **Partial** -- `logoutRequest()` fails but is caught; localStorage is still cleared | User is logged out locally (session not invalidated server-side) |

**Severity**: Complete loss of core functionality. The app cannot operate without event-admin.

---

## Dependency: event-users

| Aspect | Detail |
|--------|--------|
| Base URL config | `VITE_USERS_API_BASE_URL` (`src/modules/participants/participantsApi.ts:3`) |
| Auth mechanism | Bearer JWT (same JWT from event-admin login; forwarded as-is) |
| Endpoints consumed | `GET /api/users` (with query filters), `GET /api/users/{id}` (currently broken -- should be `/api/users/id/{id}`) |

### What breaks if event-users goes down

| Feature | Impact | User-visible behavior |
|---------|--------|----------------------|
| Participants page (`/participants`) | **Total** -- `ParticipantsPage` calls `getUsers()` | Error state or empty list |
| UserInfo component (used on Dashboard, Bookings, Booking Details) | **Graceful degradation** -- errors are caught silently (`UserInfo.tsx:21-23`) | User emails not displayed; truncated UUIDs shown as fallback |
| ParticipantPicker (booking filter) | **Degraded** -- search returns no results | Autocomplete shows no suggestions |

**Severity**: Partial degradation. Core booking viewing still works. User identity resolution fails gracefully (shows UUIDs). Participants admin page is fully broken.

**Note**: Due to the broken `getUserById` URL bug (`participantsApi.ts:57`), the UserInfo component is already non-functional even when event-users is healthy. The fallback (truncated UUID) is the current production behavior.

---

## Dependency Matrix

| Backend down | Login | Dashboard | Bookings | Booking Details | Participants |
|---|---|---|---|---|---|
| event-admin | Blocked | Broken | Broken | Broken | Broken (no JWT) |
| event-users | OK | Degraded (no emails) | Degraded (no emails) | Degraded (no emails) | Broken |
| Both | Blocked | Broken | Broken | Broken | Broken |

---

## Build-time Dependencies

| Dependency | Purpose | Reference |
|-----------|---------|-----------|
| Vite | Build tool + dev server | `package.json` |
| React 18+ | UI framework | `package.json` |
| TypeScript | Type checking | `tsconfig.json` |
| ESLint | Linting | `eslint.config.*` |

No shared npm packages from other services in this monorepo. The frontend communicates with siblings exclusively via HTTP APIs.

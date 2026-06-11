# event-admin-frontend -- Dependencies

Last updated: 2026-06-11 (audit-v2 fix pass)

## Runtime Service Dependencies

```
event-admin-frontend
    └── event-admin   (VITE_API_BASE_URL)
            └── event-users (proxied by event-admin; the frontend has NO direct dependency)
```

The former direct frontend -> event-users dependency (`VITE_USERS_API_BASE_URL`) was removed: all `/api/users/*` calls go through event-admin's authenticated admin-RBAC proxy.

---

## Dependency: event-admin

| Aspect | Detail |
|--------|--------|
| Base URL config | `VITE_API_BASE_URL` (`src/modules/shared/api.ts`) |
| Auth mechanism | Bearer JWT from event-admin's own `/auth/login` (60-min expiry) |
| Endpoints consumed | `POST /auth/login`, `POST /auth/logout`, `GET /bookings`, `GET /bookings/{uid}`, `GET /bookings/future-email-bounced`, `POST /bookings/{uid}/reassign-client`, `GET /api/users`, `POST /api/users/by-ids`, `POST /api/users/id/{id}/change-email`, `GET /api/users/id/{id}/email-changelog` |

### What breaks if event-admin goes down

| Feature | Impact | User-visible behavior |
|---------|--------|----------------------|
| Login | **Total** | Login form shows error, app unusable |
| Dashboard / bookings list / details | **Total** | Russian error state rendered per page |
| User names/emails (`UserInfo`) | **Total** | Truncated UUID fallback shown |
| Email change / reassign | **Total** | Modal error message |
| Logout | **Partial** -- `logoutRequest()` fails but is caught | Session cleared locally (no server-side revocation exists) |

**Severity**: complete loss of functionality; event-admin is the single backend.

### Degradation when event-users is down (behind the proxy)

event-admin returns the upstream error status for `/api/users/*`. Bookings pages still work, but `UserInfo` falls back to truncated UUIDs, the participants page shows an error, and email-change pre-checks fail.

---

## Notable Frontend Library Dependencies

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` 19 | UI |
| `vite` 8 + `@vitejs/plugin-react` | Build/dev server |
| `typescript` ~5.9 | Type checking (`tsc -b`) |
| `eslint` 9 + react-hooks/react-refresh plugins | Lint gate |
| `vitest` + `happy-dom` (dev) | Unit tests for api/auth/shared layers |

No router, state-management, or HTTP libraries: routing is manual (`shared/routing.ts`), data fetching is `fetch` via `apiRequest`.

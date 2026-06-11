# event-admin-frontend -- API Contracts

Last updated: 2026-06-11 (audit-v2 fix pass)

All requests go to **event-admin** (`VITE_API_BASE_URL`) through `apiRequest()` in `src/modules/shared/api.ts`.
Auth: `Authorization: Bearer <JWT from sessionStorage>` (unless `auth: false`).
Global behaviour: a 401 response to a request that carried a token clears the session and redirects to `/login`; `ApiError` exposes `.status` and `.details`, with `.message` taken from the backend `detail` field when present.

The `/api/users/*` endpoints below are event-admin's **authenticated proxy** to event-users (admin RBAC + caching applied by event-admin). The frontend never calls event-users directly.

## Auth

### POST /auth/login

- **Source**: `auth/authApi.ts`
- **Auth**: None (`auth: false`)
- **Request body**: `{ "email": string, "password": string, "totp_code": string }`
- **Response 200**: `{ "access_token": string (JWT, 60-min exp), "token_type": "Bearer", "role": "admin" | "user" }` -- the role field is informational; the JWT carries the same claim. Non-admin tokens get 403 on every data endpoint.
- **Errors**: 401 `Invalid credentials` (shown as a Russian message); 429 `Too many failed login attempts; try again later` (login throttling, translated)

### POST /auth/logout

- **Source**: `auth/authApi.ts`
- **Auth**: Bearer JWT
- **Response**: 204 No Content (best-effort; local session cleared regardless)

## Bookings

### GET /bookings

- **Source**: `bookings/bookingsApi.ts`
- **Auth**: Bearer JWT (admin)
- **Query params**: repeatable `booking_uids`, `current_statuses`, `current_organizer_user_ids`, `current_client_user_ids`; paging `limit` (frontend always sends 50; backend default 50, max 500) and `offset`
- **Response 200**: `BookingListItem[]` (bare array, no total -- paging UI uses "full page => maybe more")

### GET /bookings/{booking_uid}

- **Source**: `bookings/bookingsApi.ts` (`booking_uid` URL-encoded)
- **Auth**: Bearer JWT (admin)
- **Response 200**: `BookingDetails` (incl. `lifecycle_events`, `notifications`, `chat_events`, `video_events`, participants)
- **Errors**: 404 when unknown (no client-side retry)

### GET /bookings/future-email-bounced

- **Source**: `bookings/bookingsApi.ts` (DashboardPage)
- **Auth**: Bearer JWT (admin)
- **Response 200**: `FutureEmailBouncedBooking[]` (backend default limit 50)

### POST /bookings/{booking_uid}/reassign-client

- **Source**: `participants/emailChangeApi.ts` (`booking_uid` URL-encoded)
- **Auth**: Bearer JWT (admin)
- **Request body**: `{ "new_client_email": string }`
- **Response 202**: `{ "status": "accepted" }` -- applied asynchronously via RabbitMQ (`booking.client_reassigned`)
- **Errors**: 404 `Booking with uid=... not found`; 404 `Client with this email not found` (translated)

## Users (event-admin proxy to event-users)

### GET /api/users

- **Source**: `participants/participantsApi.ts` (`getUsers`, ParticipantsPage + ParticipantPicker)
- **Auth**: Bearer JWT (admin)
- **Query params**: `email` (substring filter), `role`, `limit` (frontend sends 50), `offset`
- **Response 200**: `{ "items": UserItem[], "total": number, "limit": number, "offset": number }`

### POST /api/users/by-ids

- **Source**: `shared/userBatchLoader.ts` (batched lookups for `UserInfo`)
- **Auth**: Bearer JWT (admin)
- **Request body**: `{ "ids": string[] }` (UUIDs, max 200)
- **Response 200**: `{ "items": UserItem[] }` -- ids missing from `items` are negative-cached client-side

### GET /api/users/id/{user_id}

- **Auth**: Bearer JWT (admin)
- **Response 200**: `UserItem`
- Currently unused by the frontend (kept for completeness; batch endpoint is preferred)

### POST /api/users/id/{user_id}/change-email

- **Source**: `participants/emailChangeApi.ts` (EmailChangeModal)
- **Auth**: Bearer JWT (admin)
- **Request body**: `{ "new_email": string }`
- **Response 202**: accepted -- applied asynchronously via RabbitMQ (`user.email.change_requested`); the frontend invalidates its user cache for this id
- **Errors** (detail strings translated in `EmailChangeModal.tsx`, fragile prose coupling -- see AUDIT):
  - 404 `User not found`
  - 400 `Only client emails can be changed`
  - 400 `New email is the same as current email`
  - 409 `Email already in use by another client` -- when a `bookingUid` is in context, the modal offers the reassign flow instead

### GET /api/users/id/{user_id}/email-changelog

- **Source**: `participants/emailChangeApi.ts`
- **Auth**: Bearer JWT (admin)
- **Query params**: `limit` (default 20), `offset`
- **Response 200**: `{ "items": [{ "id", "old_email", "new_email", "changed_by", "changed_at" }], "total": number }`

## UserItem shape

```json
{
  "id": "uuid",
  "email": "string",
  "name": "string | null",
  "role": "organizer | client",
  "time_zone": "string | null",
  "contacts": [{ "id", "user_id", "channel", "contact_id", "created_at", "updated_at" }],
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}
```

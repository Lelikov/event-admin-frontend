# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite)
npm run build     # Type-check + production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test runner is configured.

## Environment Variables'yl

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | event-admin backend base URL (e.g. `http://localhost:8000`) |
| `VITE_USERS_API_BASE_URL` | event-users backend base URL (e.g. `http://localhost:8001`) |
| `VITE_ENABLE_DEV_BYPASS_LOGIN` | `true` to show a dev login button that bypasses login |
| `VITE_DEV_BYPASS_JWT` | JWT used when dev bypass login is triggered |

## Architecture

### Routing

There is no router library. Routing is implemented manually in `src/modules/shared/routing.ts`:
- `parseRoute(pathname)` returns a typed `AppRoute` discriminated union
- `navigateTo(path)` calls `history.pushState` and dispatches `app:navigate` on `window`
- `App.tsx` listens to `popstate` and `app:navigate` events to re-render on navigation

### Module structure (`src/modules/`)

| Module | Purpose |
|---|---|
| `auth/` | Login page, `AuthContext`, JWT storage (`localStorage` key: `event_admin_jwt`), API calls |
| `bookings/` | Dashboard, bookings list, booking details pages + their API calls and types |
| `settings/` | `TimeZoneContext` — persists chosen timezone to `localStorage` (`event_admin_time_zone`) |
| `app/` | `AdminLayout` — sidebar + page shell wrapping authenticated pages |
| `participants/` | Users list page + `participantsApi.ts` — calls event-users backend (`VITE_USERS_API_BASE_URL`) with static bearer token (`VITE_USERS_API_TOKEN`) |
| `shared/` | `apiRequest` fetch wrapper, `formatDateTime` (ru-RU locale), `routing` |

### API layer

Requests to **event-admin** go through `src/modules/shared/api.ts` → `apiRequest<T>()`. It automatically:
- Prepends `VITE_API_BASE_URL`
- Attaches `Authorization: Bearer <token>` from localStorage when `auth: true` (default)
- Throws `ApiError` (with `.status` and `.details`) for non-2xx responses

Requests to **event-users** go through the `usersApiRequest` function in `participants/participantsApi.ts`. It uses `VITE_USERS_API_BASE_URL` and `VITE_USERS_API_TOKEN` (static bearer token). Endpoints are prefixed with `/api/users`.

### Auth flow

`AuthProvider` (wraps entire app) holds JWT and role in state and localStorage. `App.tsx` redirects unauthenticated users to `/login` and authenticated users away from `/login`. Login sends `email + password + totp_code` to `POST /auth/login` on event-admin. The response includes `access_token` and `role` (`"admin"` or `"user"`). The same JWT is used for both event-admin and event-users requests.

**Role-based access**: `admin` can access all pages including `/participants`. `user` is redirected away from `/participants` to `/dashboard`. The `/participants` nav item is hidden for non-admin users.

### Date formatting

`formatDateTime(isoString, timeZone?)` in `src/modules/shared/format.ts` formats dates in Russian locale (`ru-RU`). Components get the active timezone from `useTimeZone()` hook.

## Conventions

- **No `else if`** — use early returns, guard clauses, or mapping objects instead of `else if` chains
- **Avoid `else`** — prefer early returns. Use `else` only when both branches are truly symmetric

## Service Documentation

- `docs/SERVICE_OVERVIEW.md` — architecture, maturity, known issues
- `docs/API_CONTRACTS.md` — API integration contracts
- `docs/DEPENDENCIES.md` — external service dependencies and failure modes
- `docs/AUDIT.md` — audit findings for this service

Cross-service architecture docs (message contracts, system topology, onboarding) are in `../docs/`.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

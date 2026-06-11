# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite)
npm run build     # Type-check + production build
npm run lint      # Run ESLint
npm test          # Run Vitest unit tests (happy-dom)
npm run preview   # Preview production build locally
```

## Environment Variables

See `.env.example`. All backend traffic goes to event-admin only.

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | event-admin backend base URL (e.g. `http://localhost:8000`); warned if empty in prod builds |
| `VITE_ENABLE_DEV_BYPASS_LOGIN` | `true` to show a dev login button (dev builds only) |
| `VITE_DEV_BYPASS_JWT` | JWT used when dev bypass login is triggered; button hidden when unset |

## Architecture

### Routing

There is no router library. Routing is implemented manually in `src/modules/shared/routing.ts`:
- `parseRoute(pathname)` returns a typed `AppRoute` discriminated union
- `navigateTo(path)` calls `history.pushState` and dispatches `app:navigate` on `window`
- `App.tsx` listens to `popstate` and `app:navigate` events to re-render on navigation

### Module structure (`src/modules/`)

| Module | Purpose |
|---|---|
| `auth/` | Login page, `AuthProvider` + `useAuth`, JWT storage (`sessionStorage` key: `event_admin_jwt`), `jwt.ts` payload decoding, API calls |
| `bookings/` | Dashboard, paged bookings list, booking details pages + their API calls and types |
| `settings/` | `TimeZoneProvider` + `useTimeZone` — persists validated timezone to `localStorage` (`event_admin_time_zone`) |
| `app/` | `AdminLayout` — sidebar + page shell wrapping authenticated pages |
| `participants/` | Users list page, email-change/reassign modal; all user calls go through event-admin's `/api/users` proxy |
| `shared/` | `apiRequest` fetch wrapper (401 interceptor), `userBatchLoader` (batched `/api/users/by-ids` cache), `formatDateTime`, `routing`, `ErrorBoundary` |

### API layer

ALL requests (including `/api/users/*`, which event-admin proxies to event-users with admin RBAC) go through `src/modules/shared/api.ts` → `apiRequest<T>()`. It automatically:
- Prepends `VITE_API_BASE_URL`
- Attaches `Authorization: Bearer <token>` from sessionStorage when `auth: true` (default)
- Throws `ApiError` (with `.status` and `.details`) for non-2xx responses
- On 401 for a request that carried a token: clears the session and redirects to `/login` (requests with `auth: false`, i.e. login itself, never redirect)

User name/email lookups use `shared/userBatchLoader.ts`: per-microtask batching into `POST /api/users/by-ids`, session-long cache with negative caching, `invalidateUser`/`clearUserCache` + a subscription consumed by `UserInfo`.

### Auth flow

`AuthProvider` (wraps entire app) holds the JWT in state and sessionStorage and drops expired tokens at startup (`auth/jwt.ts` decodes the `exp` claim). `App.tsx` redirects unauthenticated users to `/login` and authenticated users away from `/login`. Login sends `email + password + totp_code` to `POST /auth/login` on event-admin (tokens live 60 minutes; 401 and 429 are translated to Russian messages).

**Role-based access**: none client-side. event-admin requires `role="admin"` on every data endpoint, so only admin tokens can use the app; the role is a JWT claim and is not stored separately.

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

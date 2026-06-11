const TOKEN_STORAGE_KEY = 'event_admin_jwt'
const LEGACY_ROLE_STORAGE_KEY = 'event_admin_role'

// The JWT lives in sessionStorage, not localStorage: it is scoped to the tab
// and dropped when the tab closes, narrowing the theft window for a token
// that event-admin keeps valid for 60 minutes. event-admin has no refresh
// endpoint and no httpOnly-cookie session, so a JS-readable token remains an
// accepted residual risk — see docs/AUDIT.md.
// The role is NOT stored: it is derived from the JWT payload when needed.

// One-time cleanup of keys written by older builds (token and role used to
// live in localStorage, where any later XSS could read them indefinitely).
localStorage.removeItem(TOKEN_STORAGE_KEY)
localStorage.removeItem(LEGACY_ROLE_STORAGE_KEY)

export function getJwtToken(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setJwtToken(token: string): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function removeJwtToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
}

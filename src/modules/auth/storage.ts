const TOKEN_STORAGE_KEY = 'event_admin_jwt'
// Note: role is also encoded in the JWT payload. Consider deriving it from the token instead of storing separately to prevent mismatch.
const ROLE_STORAGE_KEY = 'event_admin_role'

export function getJwtToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setJwtToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function removeJwtToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function getUserRole(): string | null {
  return localStorage.getItem(ROLE_STORAGE_KEY)
}

export function setUserRole(role: string): void {
  localStorage.setItem(ROLE_STORAGE_KEY, role)
}

export function removeUserRole(): void {
  localStorage.removeItem(ROLE_STORAGE_KEY)
}

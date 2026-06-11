import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './api.ts'
import { getJwtToken, setJwtToken } from '../auth/storage.ts'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const fetchMock = vi.fn()

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('attaches the Bearer token to authenticated requests', async () => {
    setJwtToken('token-123')
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))

    await apiRequest('/bookings')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123')
  })

  it('does not attach a token and does not redirect on 401 for auth:false (login)', async () => {
    setJwtToken('token-123')
    fetchMock.mockResolvedValue(
      jsonResponse(401, { detail: { code: 'invalid_credentials', message: 'Invalid credentials' } }),
    )
    const hrefBefore = window.location.href

    await expect(
      apiRequest('/auth/login', { method: 'POST', body: { email: 'x' }, auth: false }),
    ).rejects.toMatchObject({ status: 401, code: 'invalid_credentials', message: 'Invalid credentials' })

    // Session is untouched: the user stays on the login page and sees the error.
    expect(getJwtToken()).toBe('token-123')
    expect(window.location.href).toBe(hrefBefore)
  })

  it('clears the session and redirects to /login on 401 when a token was attached', async () => {
    setJwtToken('expired-token')
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: { code: 'token_expired', message: 'Token expired' } }))

    await expect(apiRequest('/bookings')).rejects.toBeInstanceOf(ApiError)

    expect(getJwtToken()).toBeNull()
    expect(window.location.href).toContain('/login')
  })

  it('returns null for 204 responses', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(apiRequest('/auth/logout', { method: 'POST' })).resolves.toBeNull()
  })

  it('extracts code and message from a structured error detail', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, {
        detail: { code: 'too_many_login_attempts', message: 'Too many failed login attempts; try again later' },
      }),
    )

    await expect(apiRequest('/auth/login', { auth: false })).rejects.toMatchObject({
      status: 429,
      code: 'too_many_login_attempts',
      message: 'Too many failed login attempts; try again later',
    })
  })

  it('tolerates a legacy plain-string detail (code stays null)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { detail: 'Email already in use by another client' }))

    await expect(apiRequest('/api/users/id/u1/change-email', { auth: false })).rejects.toMatchObject({
      status: 409,
      code: null,
      message: 'Email already in use by another client',
    })
  })

  it('falls back to a generic message when detail.message is missing', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { detail: { code: 'not_a_client' } }))

    await expect(apiRequest('/api/users/id/u1/change-email', { auth: false })).rejects.toMatchObject({
      status: 400,
      code: 'not_a_client',
      message: 'Ошибка запроса (400)',
    })
  })

  it('falls back to a generic Russian message when there is no detail', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 500 }))

    await expect(apiRequest('/bookings')).rejects.toMatchObject({
      status: 500,
      message: 'Ошибка запроса (500)',
    })
  })
})

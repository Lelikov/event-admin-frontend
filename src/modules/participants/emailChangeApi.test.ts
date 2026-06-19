import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestEmailChange } from './emailChangeApi.ts'
import { setJwtToken } from '../auth/storage.ts'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('requestEmailChange', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.clear()
    setJwtToken('admin-token')
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('puts new_email and booking_uid in the body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(202, { status: 'accepted' }))
    await requestEmailChange('user-1', 'new@example.com', 'book-123')
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ new_email: 'new@example.com', booking_uid: 'book-123' })
  })

  it('sends only new_email when booking_uid omitted', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(202, { status: 'accepted' }))
    await requestEmailChange('user-1', 'new@example.com')
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ new_email: 'new@example.com' })
  })
})

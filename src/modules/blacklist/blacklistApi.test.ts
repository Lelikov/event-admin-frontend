import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../shared/api.ts'
import { setJwtToken } from '../auth/storage.ts'
import {
  createBlacklistEntry,
  deleteBlacklistEntry,
  getBlacklistEntries,
  translateBlacklistError,
  updateBlacklistEntry,
} from './blacklistApi.ts'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const fetchMock = vi.fn()

beforeEach(() => {
  sessionStorage.clear()
  setJwtToken('admin-token')
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const emptyList = { items: [], total: 0, limit: 50, offset: 0 }

// VITE_API_BASE_URL from the local .env leaks into vitest; compare path+query only.
function requestedPath(call: unknown[]): string {
  const [url] = call as [string]
  return url.replace(/^https?:\/\/[^/]+/, '')
}

describe('getBlacklistEntries', () => {
  it('requests /api/blacklist without a query string when there are no filters', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, emptyList))

    await getBlacklistEntries()

    expect(requestedPath(fetchMock.mock.calls[0])).toBe('/api/blacklist')
  })

  it('serializes filters and pagination into the query string', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, emptyList))

    await getBlacklistEntries({
      field: 'client_email',
      value: 'spam@',
      only_effective: true,
      limit: 50,
      offset: 100,
    })

    expect(requestedPath(fetchMock.mock.calls[0])).toBe(
      '/api/blacklist?field=client_email&value=spam%40&only_effective=true&limit=50&offset=100',
    )
  })

  it('omits only_effective=false from the query string', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, emptyList))

    await getBlacklistEntries({ only_effective: false, limit: 50, offset: 0 })

    expect(requestedPath(fetchMock.mock.calls[0])).toBe('/api/blacklist?limit=50&offset=0')
  })
})

describe('createBlacklistEntry', () => {
  it('POSTs the payload with the auth token attached', async () => {
    const entry = {
      id: 'e1',
      field: 'client_email',
      value: 'spam@example.com',
      is_active: true,
      active_from: null,
      active_until: null,
      comment: null,
      created_by: 'admin@example.com',
      created_at: '2026-06-12T00:00:00Z',
      updated_at: '2026-06-12T00:00:00Z',
    }
    fetchMock.mockResolvedValue(jsonResponse(201, entry))

    const result = await createBlacklistEntry({
      field: 'client_email',
      value: 'spam@example.com',
      is_active: true,
      active_from: null,
      active_until: null,
      comment: null,
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(requestedPath(fetchMock.mock.calls[0])).toBe('/api/blacklist')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      field: 'client_email',
      value: 'spam@example.com',
      is_active: true,
      active_from: null,
      active_until: null,
      comment: null,
    })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer admin-token')
    expect(result).toEqual(entry)
  })
})

describe('updateBlacklistEntry', () => {
  it('PATCHes only the provided keys and keeps explicit nulls (clear window)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}))

    await updateBlacklistEntry('e1', { is_active: false, active_until: null })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(requestedPath(fetchMock.mock.calls[0])).toBe('/api/blacklist/e1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ is_active: false, active_until: null })
  })
})

describe('deleteBlacklistEntry', () => {
  it('issues DELETE and resolves on 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(deleteBlacklistEntry('e1')).resolves.toBeUndefined()

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(requestedPath(fetchMock.mock.calls[0])).toBe('/api/blacklist/e1')
    expect(init.method).toBe('DELETE')
  })

  it('throws ApiError with the machine-readable code on 404', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { detail: { code: 'blacklist_entry_not_found', message: 'Blacklist entry e1 not found' } }),
    )

    await expect(deleteBlacklistEntry('e1')).rejects.toMatchObject({
      status: 404,
      code: 'blacklist_entry_not_found',
    })
  })
})

describe('translateBlacklistError', () => {
  it.each([
    ['blacklist_entry_not_found', 'Запись чёрного списка не найдена'],
    ['invalid_active_window', 'Дата начала действия не может быть позже даты окончания'],
    ['invalid_value', 'Значение не может быть пустым'],
    ['empty_update', 'Не указано ни одного поля для изменения'],
    ['field_not_nullable', 'Это поле обязательно и не может быть очищено'],
  ])('translates %s to Russian', (code, expected) => {
    const err = new ApiError('backend message', 400, null, code)
    expect(translateBlacklistError(err)).toBe(expected)
  })

  it('falls back to the backend message for unknown codes', () => {
    const err = new ApiError('Something else happened', 400, null, 'unknown_code')
    expect(translateBlacklistError(err)).toBe('Something else happened')
  })

  it('falls back to the backend message when code is null', () => {
    const err = new ApiError('Ошибка запроса (500)', 500, null, null)
    expect(translateBlacklistError(err)).toBe('Ошибка запроса (500)')
  })
})

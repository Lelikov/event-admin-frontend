import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserItem } from '../participants/participantsApi.ts'

vi.mock('./api.ts', () => ({
  apiRequest: vi.fn(),
}))

import { apiRequest } from './api.ts'
import {
  clearUserCache,
  getCachedUser,
  hasCachedUser,
  invalidateUser,
  loadUser,
  subscribeToUserCache,
} from './userBatchLoader.ts'

const apiRequestMock = vi.mocked(apiRequest)

function makeUser(id: string): UserItem {
  return {
    id,
    email: `${id}@example.com`,
    name: `User ${id}`,
    role: 'client',
    time_zone: null,
    contacts: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

beforeEach(() => {
  clearUserCache()
  apiRequestMock.mockReset()
})

describe('userBatchLoader', () => {
  it('batches concurrent loads into a single by-ids request', async () => {
    apiRequestMock.mockResolvedValue({ items: [makeUser('a'), makeUser('b')] })

    const [a, b] = await Promise.all([loadUser('a'), loadUser('b')])

    expect(apiRequestMock).toHaveBeenCalledTimes(1)
    expect(apiRequestMock).toHaveBeenCalledWith('/api/users/by-ids', {
      method: 'POST',
      body: { ids: ['a', 'b'] },
    })
    expect(a?.email).toBe('a@example.com')
    expect(b?.email).toBe('b@example.com')
  })

  it('serves repeat loads from the cache without re-requesting', async () => {
    apiRequestMock.mockResolvedValue({ items: [makeUser('a')] })

    await loadUser('a')
    const again = await loadUser('a')

    expect(apiRequestMock).toHaveBeenCalledTimes(1)
    expect(again?.id).toBe('a')
    expect(getCachedUser('a')?.id).toBe('a')
  })

  it('negative-caches ids the backend did not return', async () => {
    apiRequestMock.mockResolvedValue({ items: [] })

    const missing = await loadUser('ghost')
    const missingAgain = await loadUser('ghost')

    expect(missing).toBeNull()
    expect(missingAgain).toBeNull()
    expect(apiRequestMock).toHaveBeenCalledTimes(1)
    expect(hasCachedUser('ghost')).toBe(true)
    expect(getCachedUser('ghost')).toBeNull()
  })

  it('re-fetches after invalidateUser and notifies subscribers', async () => {
    apiRequestMock.mockResolvedValue({ items: [makeUser('a')] })
    await loadUser('a')

    const listener = vi.fn()
    const unsubscribe = subscribeToUserCache(listener)

    invalidateUser('a')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(hasCachedUser('a')).toBe(false)

    await loadUser('a')
    expect(apiRequestMock).toHaveBeenCalledTimes(2)
    // Cache repopulation also notifies.
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('rejects all pending loads when the batch request fails', async () => {
    apiRequestMock.mockRejectedValue(new Error('network down'))

    await expect(loadUser('a')).rejects.toThrow('network down')
    expect(hasCachedUser('a')).toBe(false)
  })
})

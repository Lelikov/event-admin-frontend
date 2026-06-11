import { apiRequest } from './api.ts'
import type { UserItem } from '../participants/participantsApi.ts'

type PendingRequest = {
  resolve: (user: UserItem | null) => void
  reject: (error: unknown) => void
}

// null values are negative-cache entries: the backend reported the id as
// unknown, so repeated mounts do not re-request it.
const cache = new Map<string, UserItem | null>()
const pending = new Map<string, PendingRequest[]>()
let scheduled = false

// Subscription support so components (UserInfo) can re-render and re-fetch
// after invalidation — e.g. when an email change drops a cached user.
let cacheVersion = 0
const listeners = new Set<() => void>()

function notify() {
  cacheVersion += 1
  for (const listener of listeners) listener()
}

export function subscribeToUserCache(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getUserCacheVersion(): number {
  return cacheVersion
}

function flush() {
  scheduled = false
  const batch = new Map(pending)
  pending.clear()

  const ids = [...batch.keys()]
  if (ids.length === 0) return

  apiRequest<{ items: UserItem[] }>('/api/users/by-ids', {
    method: 'POST',
    body: { ids },
  })
    .then((response) => {
      const byId = new Map<string, UserItem>()
      for (const item of response.items) {
        byId.set(item.id, item)
      }
      for (const id of batch.keys()) {
        cache.set(id, byId.get(id) ?? null)
      }
      for (const [id, callbacks] of batch) {
        const user = byId.get(id) ?? null
        for (const cb of callbacks) cb.resolve(user)
      }
      notify()
    })
    .catch((error) => {
      for (const callbacks of batch.values()) {
        for (const cb of callbacks) cb.reject(error)
      }
    })
}

export function loadUser(userId: string): Promise<UserItem | null> {
  if (cache.has(userId)) {
    return Promise.resolve(cache.get(userId) ?? null)
  }

  return new Promise<UserItem | null>((resolve, reject) => {
    const existing = pending.get(userId)
    if (existing) {
      existing.push({ resolve, reject })
      return
    }
    pending.set(userId, [{ resolve, reject }])

    if (!scheduled) {
      scheduled = true
      queueMicrotask(flush)
    }
  })
}

export function getCachedUser(userId: string): UserItem | null {
  return cache.get(userId) ?? null
}

export function hasCachedUser(userId: string): boolean {
  return cache.has(userId)
}

/** Drops one user from the cache (e.g. after an email-change request). */
export function invalidateUser(userId: string): void {
  if (!cache.delete(userId)) return
  notify()
}

/** Drops the whole cache (e.g. on logout or for tests). */
export function clearUserCache(): void {
  if (cache.size === 0) return
  cache.clear()
  notify()
}

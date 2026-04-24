import { apiRequest } from './api.ts'
import type { UserItem } from '../participants/participantsApi.ts'

type PendingRequest = {
  resolve: (user: UserItem | null) => void
  reject: (error: unknown) => void
}

const cache = new Map<string, UserItem>()
const pending = new Map<string, PendingRequest[]>()
let scheduled = false

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
        cache.set(item.id, item)
      }
      for (const [id, callbacks] of batch) {
        const user = byId.get(id) ?? null
        for (const cb of callbacks) cb.resolve(user)
      }
    })
    .catch((error) => {
      for (const callbacks of batch.values()) {
        for (const cb of callbacks) cb.reject(error)
      }
    })
}

export function loadUser(userId: string): Promise<UserItem | null> {
  const cached = cache.get(userId)
  if (cached) return Promise.resolve(cached)

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

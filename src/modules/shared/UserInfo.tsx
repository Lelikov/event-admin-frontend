import { useEffect, useState, useSyncExternalStore } from 'react'
import { UserInfoView } from 'events-design-system'
import type { UserItem } from '../participants/participantsApi.ts'
import {
  getCachedUser,
  getUserCacheVersion,
  hasCachedUser,
  loadUser,
  subscribeToUserCache,
} from './userBatchLoader.ts'

type Props = {
  userId: string | null | undefined
  fallback?: string
  /** "full" = name + email stacked; "name" = name only (falls back to email); "inline" = "Name · email" on one line */
  variant?: 'full' | 'name' | 'inline'
}

type FetchResult = {
  userId: string
  user: UserItem | null
}

/**
 * Resolves a user through the batch loader cache. The cache itself is the
 * source of truth (read during render via useSyncExternalStore); local state
 * only records that a fetch settled, so there is no synchronous setState in
 * the effect and invalidations re-trigger the fetch automatically.
 */
function useUser(userId: string | null | undefined): { user: UserItem | null; loading: boolean } {
  const version = useSyncExternalStore(subscribeToUserCache, getUserCacheVersion)
  const [fetchResult, setFetchResult] = useState<FetchResult | null>(null)

  const cached = userId != null && hasCachedUser(userId)

  useEffect(() => {
    if (!userId) return
    if (hasCachedUser(userId)) return
    let cancelled = false
    loadUser(userId)
      .then((user) => {
        if (!cancelled) setFetchResult({ userId, user })
      })
      .catch(() => {
        // Network/auth failure: settle as "no user" so the fallback text shows.
        if (!cancelled) setFetchResult({ userId, user: null })
      })
    return () => {
      cancelled = true
    }
  }, [userId, version])

  if (!userId) return { user: null, loading: false }
  if (cached) return { user: getCachedUser(userId), loading: false }
  if (fetchResult?.userId === userId) return { user: fetchResult.user, loading: false }
  return { user: null, loading: true }
}

export function UserInfo({ userId, fallback = '—', variant = 'full' }: Props) {
  const { user, loading } = useUser(userId)

  if (!userId) return <>{fallback}</>
  if (loading) return <span className="user-info-loading">…</span>
  if (!user) return <span className="user-info-id">{userId.slice(0, 8)}…</span>

  return <UserInfoView name={user.name ?? null} email={user.email} variant={variant} />
}

import { useEffect, useState } from 'react'
import type { UserItem } from '../participants/participantsApi.ts'
import { getCachedUser, loadUser } from './userBatchLoader.ts'

type Props = {
  userId: string | null | undefined
  fallback?: string
  /** "full" = name + email stacked; "name" = name only (falls back to email); "inline" = "Name · email" on one line */
  variant?: 'full' | 'name' | 'inline'
}

function userInitials(user: UserItem): string {
  if (!user.name) return user.email[0].toUpperCase()
  return user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function UserInfo({ userId, fallback = '—', variant = 'full' }: Props) {
  const [user, setUser] = useState<UserItem | null>(() =>
    userId ? getCachedUser(userId) : null,
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    const cached = getCachedUser(userId)
    if (cached) {
      setUser(cached)
      return
    }
    let cancelled = false
    setLoading(true)
    loadUser(userId)
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        // silently fall back to shortened UUID
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (!userId) return <>{fallback}</>
  if (loading) return <span className="user-info-loading">…</span>

  if (!user) return <span className="user-info-id">{userId.slice(0, 8)}…</span>

  if (variant === 'name') {
    return <span className="user-info-name-only">{user.name ?? user.email}</span>
  }

  if (variant === 'inline') {
    if (!user.name) return <span className="user-info-name-only">{user.email}</span>
    return (
      <span className="user-info-inline">
        <span className="user-info-inline-name">{user.name}</span>
        <span className="user-info-inline-sep"> · </span>
        <span className="user-info-inline-email">{user.email}</span>
      </span>
    )
  }

  // variant === 'full'
  return (
    <span className="user-info">
      <span className="user-info-avatar">{userInitials(user)}</span>
      <span className="user-info-details">
        <span className="user-info-primary">{user.name ?? user.email}</span>
        {user.name && <span className="user-info-secondary">{user.email}</span>}
      </span>
    </span>
  )
}

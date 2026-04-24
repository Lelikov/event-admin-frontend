import { apiRequest } from '../shared/api.ts'

export type UserContactItem = {
  id: string
  user_id: string
  channel: string
  contact_id: string
  created_at: string
  updated_at: string
}

export type UserItem = {
  id: string
  email: string
  name: string | null
  role: string
  time_zone: string | null
  contacts: UserContactItem[]
  created_at: string
  updated_at: string
}

export type ListUsersResponse = {
  items: UserItem[]
  total: number
  limit: number
  offset: number
}

export type GetUsersFilters = {
  email?: string
  role?: string
  limit?: number
  offset?: number
}

// Keep as alias so existing imports of ParticipantItem continue to work
export type ParticipantItem = UserItem

export async function getUsers(filters?: GetUsersFilters): Promise<ListUsersResponse> {
  const params = new URLSearchParams()
  if (filters?.email) params.set('email', filters.email)
  if (filters?.role) params.set('role', filters.role)
  if (filters?.limit != null) params.set('limit', String(filters.limit))
  if (filters?.offset != null) params.set('offset', String(filters.offset))
  const qs = params.toString()
  return apiRequest<ListUsersResponse>(`/api/users${qs ? `?${qs}` : ''}`)
}

// Convenience wrapper for ParticipantPicker: returns items with optional single-role filter
export async function getParticipants(filters?: {
  email?: string
  role?: string
}): Promise<UserItem[]> {
  const result = await getUsers({ email: filters?.email, role: filters?.role, limit: 50 })
  return result.items
}

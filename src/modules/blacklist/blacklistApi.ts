import { ApiError, apiRequest } from '../shared/api.ts'

export type BlacklistEntry = {
  id: string
  field: string
  value: string
  is_active: boolean
  active_from: string | null
  active_until: string | null
  comment: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type BlacklistListResponse = {
  items: BlacklistEntry[]
  total: number
  limit: number
  offset: number
}

export type GetBlacklistFilters = {
  field?: string
  /** Substring match on value. */
  value?: string
  only_effective?: boolean
  limit?: number
  offset?: number
}

export type BlacklistCreatePayload = {
  field: string
  value: string
  is_active: boolean
  active_from: string | null
  active_until: string | null
  comment: string | null
}

/**
 * PATCH body: only the keys present are updated (backend uses exclude_unset).
 * active_from / active_until / comment accept explicit null to clear the value.
 */
export type BlacklistUpdatePayload = Partial<BlacklistCreatePayload>

export async function getBlacklistEntries(filters?: GetBlacklistFilters): Promise<BlacklistListResponse> {
  const params = new URLSearchParams()
  if (filters?.field) params.set('field', filters.field)
  if (filters?.value) params.set('value', filters.value)
  if (filters?.only_effective) params.set('only_effective', 'true')
  if (filters?.limit != null) params.set('limit', String(filters.limit))
  if (filters?.offset != null) params.set('offset', String(filters.offset))
  const qs = params.toString()
  return apiRequest<BlacklistListResponse>(`/api/blacklist${qs ? `?${qs}` : ''}`)
}

export async function createBlacklistEntry(payload: BlacklistCreatePayload): Promise<BlacklistEntry> {
  return apiRequest<BlacklistEntry>('/api/blacklist', { method: 'POST', body: payload })
}

export async function updateBlacklistEntry(
  entryId: string,
  payload: BlacklistUpdatePayload,
): Promise<BlacklistEntry> {
  return apiRequest<BlacklistEntry>(`/api/blacklist/${encodeURIComponent(entryId)}`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function deleteBlacklistEntry(entryId: string): Promise<void> {
  await apiRequest<null>(`/api/blacklist/${encodeURIComponent(entryId)}`, { method: 'DELETE' })
}

// Keyed on the stable machine-readable error codes returned by event-admin
// (detail.code, see event-admin docs/API_CONTRACTS.md § Blacklist).
// Unknown codes fall back to the backend-provided human message.
const ERROR_MESSAGES: Record<string, string> = {
  blacklist_entry_not_found: 'Запись чёрного списка не найдена',
  invalid_active_window: 'Дата начала действия не может быть позже даты окончания',
  invalid_value: 'Значение не может быть пустым',
  empty_update: 'Не указано ни одного поля для изменения',
  field_not_nullable: 'Это поле обязательно и не может быть очищено',
}

export function translateBlacklistError(err: ApiError): string {
  if (err.code !== null && err.code in ERROR_MESSAGES) return ERROR_MESSAGES[err.code]
  return err.message
}

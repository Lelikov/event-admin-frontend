import type { BlacklistEntry } from './blacklistApi.ts'

type EffectivenessInput = Pick<BlacklistEntry, 'is_active' | 'active_from' | 'active_until'>

/**
 * Mirrors the backend rule: an entry blocks bookings when is_active is true
 * AND now is within [active_from, active_until] (a NULL bound is unbounded).
 */
export function isEffectiveNow(entry: EffectivenessInput, now: Date = new Date()): boolean {
  if (!entry.is_active) return false
  if (entry.active_from !== null && now < new Date(entry.active_from)) return false
  if (entry.active_until !== null && now > new Date(entry.active_until)) return false
  return true
}

/**
 * ISO timestamp (UTC or offset) → value for <input type="datetime-local">
 * in the browser's local time zone ('YYYY-MM-DDTHH:mm'); '' for null.
 */
export function toDatetimeLocalValue(iso: string | null): string {
  if (iso === null) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${datePart}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * <input type="datetime-local"> value (browser-local time) → UTC ISO string;
 * empty input → null (unbounded).
 */
export function fromDatetimeLocalValue(value: string): string | null {
  if (value === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

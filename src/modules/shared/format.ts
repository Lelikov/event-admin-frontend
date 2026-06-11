export function formatDateTime(value: string | null | undefined, timeZone?: string): string {
  if (value == null) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const options = { dateStyle: 'medium', timeStyle: 'short' } as const

  try {
    return new Intl.DateTimeFormat('ru-RU', { ...options, timeZone }).format(date)
  } catch {
    // An invalid timeZone makes Intl.DateTimeFormat throw RangeError during
    // render; fall back to the browser default zone instead of crashing.
    return new Intl.DateTimeFormat('ru-RU', options).format(date)
  }
}

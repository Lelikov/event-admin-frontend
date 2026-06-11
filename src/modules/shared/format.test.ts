import { describe, expect, it } from 'vitest'
import { formatDateTime } from './format.ts'

describe('formatDateTime', () => {
  it('returns a dash for null/undefined', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('returns the raw value for unparseable dates', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date')
  })

  it('formats with an explicit valid timezone', () => {
    const result = formatDateTime('2026-06-11T12:00:00Z', 'UTC')
    expect(result).toContain('2026')
  })

  it('falls back to the default zone instead of crashing on an invalid timezone', () => {
    const result = formatDateTime('2026-06-11T12:00:00Z', 'Not/AZone')
    expect(result).toContain('2026')
  })
})

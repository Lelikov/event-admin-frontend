import { describe, expect, it } from 'vitest'
import { fromDatetimeLocalValue, isEffectiveNow, toDatetimeLocalValue } from './effectiveness.ts'

const NOW = new Date('2026-06-12T12:00:00Z')

function entry(overrides: Partial<Parameters<typeof isEffectiveNow>[0]> = {}) {
  return { is_active: true, active_from: null, active_until: null, ...overrides }
}

describe('isEffectiveNow', () => {
  it('is effective when active with an unbounded window', () => {
    expect(isEffectiveNow(entry(), NOW)).toBe(true)
  })

  it('is not effective when the flag is off, regardless of the window', () => {
    expect(isEffectiveNow(entry({ is_active: false }), NOW)).toBe(false)
    expect(
      isEffectiveNow(
        entry({ is_active: false, active_from: '2026-01-01T00:00:00Z', active_until: '2027-01-01T00:00:00Z' }),
        NOW,
      ),
    ).toBe(false)
  })

  it('is not effective before active_from', () => {
    expect(isEffectiveNow(entry({ active_from: '2026-06-12T13:00:00Z' }), NOW)).toBe(false)
  })

  it('is not effective after active_until', () => {
    expect(isEffectiveNow(entry({ active_until: '2026-06-12T11:00:00Z' }), NOW)).toBe(false)
  })

  it('is effective inside a bounded window (bounds inclusive)', () => {
    expect(
      isEffectiveNow(entry({ active_from: '2026-06-12T11:00:00Z', active_until: '2026-06-12T13:00:00Z' }), NOW),
    ).toBe(true)
    expect(isEffectiveNow(entry({ active_from: '2026-06-12T12:00:00Z' }), NOW)).toBe(true)
    expect(isEffectiveNow(entry({ active_until: '2026-06-12T12:00:00Z' }), NOW)).toBe(true)
  })

  it('handles half-open windows on each side', () => {
    expect(isEffectiveNow(entry({ active_from: '2026-06-12T11:00:00Z' }), NOW)).toBe(true)
    expect(isEffectiveNow(entry({ active_until: '2026-06-12T13:00:00Z' }), NOW)).toBe(true)
  })
})

describe('datetime-local conversion', () => {
  it('maps null/empty to each other (unbounded)', () => {
    expect(toDatetimeLocalValue(null)).toBe('')
    expect(fromDatetimeLocalValue('')).toBeNull()
  })

  it('round-trips an ISO timestamp through the local input format', () => {
    const iso = '2026-06-12T09:30:00.000Z'
    const local = toDatetimeLocalValue(iso)
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(fromDatetimeLocalValue(local)).toBe(iso)
  })

  it('round-trips a local input value through ISO', () => {
    const local = '2026-06-12T15:45'
    const iso = fromDatetimeLocalValue(local)
    expect(iso).not.toBeNull()
    expect(toDatetimeLocalValue(iso)).toBe(local)
  })

  it('returns safe fallbacks for malformed input', () => {
    expect(toDatetimeLocalValue('not-a-date')).toBe('')
    expect(fromDatetimeLocalValue('not-a-date')).toBeNull()
  })
})

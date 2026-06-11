import { describe, expect, it } from 'vitest'
import { parseRoute } from './routing.ts'

describe('parseRoute', () => {
  it('parses known routes', () => {
    expect(parseRoute('/login')).toEqual({ name: 'login' })
    expect(parseRoute('/')).toEqual({ name: 'dashboard' })
    expect(parseRoute('/dashboard')).toEqual({ name: 'dashboard' })
    expect(parseRoute('/bookings')).toEqual({ name: 'bookings' })
    expect(parseRoute('/participants')).toEqual({ name: 'participants' })
  })

  it('parses booking details and decodes the uid', () => {
    expect(parseRoute('/bookings/abc123')).toEqual({ name: 'booking-details', bookingUid: 'abc123' })
    expect(parseRoute('/bookings/a%2Fb')).toEqual({ name: 'booking-details', bookingUid: 'a/b' })
  })

  it('returns not-found for unknown paths', () => {
    expect(parseRoute('/nope')).toEqual({ name: 'not-found' })
    expect(parseRoute('/bookings/a/b')).toEqual({ name: 'not-found' })
  })
})

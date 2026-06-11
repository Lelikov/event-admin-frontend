import { describe, expect, it } from 'vitest'
import { decodeJwtPayload, isTokenExpired } from './jwt.ts'

function makeToken(payload: object): string {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${base64}.signature`
}

describe('decodeJwtPayload', () => {
  it('decodes a base64url payload', () => {
    const token = makeToken({ sub: 'a@b.c', role: 'admin', exp: 123 })
    expect(decodeJwtPayload(token)).toEqual({ sub: 'a@b.c', role: 'admin', exp: 123 })
  })

  it('decodes payloads containing base64url-specific characters', () => {
    // '???>' encodes to 'Pz8/Pg==' in base64 → 'Pz8_Pg' in base64url
    const token = makeToken({ sub: '???>', role: 'admin' })
    expect(decodeJwtPayload(token)?.sub).toBe('???>')
  })

  it('returns null for a token without dots (e.g. unset dev bypass values)', () => {
    expect(decodeJwtPayload('dev-bypass-jwt-token')).toBeNull()
  })

  it('returns null for garbage payloads', () => {
    expect(decodeJwtPayload('a.%%%%.c')).toBeNull()
    expect(decodeJwtPayload('')).toBeNull()
  })

  it('returns null for non-object payloads', () => {
    const base64 = btoa(JSON.stringify('just-a-string'))
    expect(decodeJwtPayload(`a.${base64}.c`)).toBeNull()
  })
})

describe('isTokenExpired', () => {
  it('is true when exp is in the past', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 60 })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('is false when exp is in the future', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 })
    expect(isTokenExpired(token)).toBe(false)
  })

  it('treats undecodable tokens as not expired (backend will 401 them)', () => {
    expect(isTokenExpired('garbage')).toBe(false)
  })

  it('treats tokens without exp as not expired', () => {
    const token = makeToken({ sub: 'a@b.c' })
    expect(isTokenExpired(token)).toBe(false)
  })
})

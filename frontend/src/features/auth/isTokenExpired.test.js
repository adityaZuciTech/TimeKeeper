import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isTokenExpired } from './tokenUtils'

function buildJwt(expOffsetSeconds) {
  const payload = { exp: Math.floor(Date.now() / 1000) + expOffsetSeconds, sub: 'test' }
  const encoded = btoa(JSON.stringify(payload))
  return `header.${encoded}.sig`
}

function buildJwtNoExp() {
  const payload = { sub: 'test' }
  const encoded = btoa(JSON.stringify(payload))
  return `header.${encoded}.sig`
}

describe('isTokenExpired', () => {
  // ── TOK-01: future exp → valid ──────────────────────────────────────────

  it('TOK-01: token with future exp returns false', () => {
    expect(isTokenExpired(buildJwt(3600))).toBe(false)
  })

  // ── TOK-02: past exp → expired ─────────────────────────────────────────

  it('TOK-02: token with past exp returns true', () => {
    // -100 seconds: well past the 10s clock-skew buffer
    expect(isTokenExpired(buildJwt(-100))).toBe(true)
  })

  // ── TOK-03: token within 10-second grace period (expired <10s ago) → still valid

  it('TOK-03: token expired less than 10 seconds ago is still accepted (grace period)', () => {
    // -5 seconds: within the 10s grace window → should return false (not expired)
    expect(isTokenExpired(buildJwt(-5))).toBe(false)
  })

  // ── TOK-04: malformed token (not 3 segments) → expired ─────────────────

  it('TOK-04: malformed token returns true', () => {
    expect(isTokenExpired('not.a.valid.jwt.here')).toBe(true)
    expect(isTokenExpired('onlyone')).toBe(true)
    expect(isTokenExpired('')).toBe(true)
  })

  // ── TOK-05: no exp claim in payload → expired ───────────────────────────

  it('TOK-05: token without exp claim returns true', () => {
    expect(isTokenExpired(buildJwtNoExp())).toBe(true)
  })
})

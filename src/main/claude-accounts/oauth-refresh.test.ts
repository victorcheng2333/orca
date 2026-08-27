import { describe, expect, it } from 'vitest'
import {
  applyRefreshedToken,
  isOauthTokenExpiring,
  parseClaudeOauthBlob,
  readRefreshToken,
  refreshClaudeOauthCredentials
} from './oauth-refresh'

const NOW = 1_700_000_000_000

function credentials(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    claudeAiOauth: {
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: NOW + 60 * 60 * 1000,
      scopes: ['user:inference', 'user:profile'],
      ...overrides
    }
  })
}

describe('parseClaudeOauthBlob', () => {
  it('returns the oauth block', () => {
    expect(parseClaudeOauthBlob(credentials())?.accessToken).toBe('old-access')
  })

  it('returns null for non-JSON or missing block', () => {
    expect(parseClaudeOauthBlob('not json')).toBeNull()
    expect(parseClaudeOauthBlob('{}')).toBeNull()
    expect(parseClaudeOauthBlob('{"claudeAiOauth":[]}')).toBeNull()
  })
})

describe('readRefreshToken', () => {
  it('reads a present token', () => {
    expect(readRefreshToken(credentials())).toBe('old-refresh')
  })

  it('returns null for blank or missing tokens', () => {
    expect(readRefreshToken(credentials({ refreshToken: '   ' }))).toBeNull()
    expect(readRefreshToken(credentials({ refreshToken: undefined }))).toBeNull()
  })
})

describe('isOauthTokenExpiring', () => {
  it('is false when well within validity', () => {
    expect(isOauthTokenExpiring(credentials(), NOW)).toBe(false)
  })

  it('is true within the 5-minute buffer', () => {
    expect(isOauthTokenExpiring(credentials({ expiresAt: NOW + 60 * 1000 }), NOW)).toBe(true)
  })

  it('is true when already expired', () => {
    expect(isOauthTokenExpiring(credentials({ expiresAt: NOW - 1000 }), NOW)).toBe(true)
  })

  it('treats missing/non-numeric expiry as expiring', () => {
    expect(isOauthTokenExpiring(credentials({ expiresAt: undefined }), NOW)).toBe(true)
    expect(isOauthTokenExpiring(credentials({ expiresAt: 'soon' }), NOW)).toBe(true)
  })

  it('is false for credentials without an oauth block', () => {
    expect(isOauthTokenExpiring('{}', NOW)).toBe(false)
  })
})

describe('applyRefreshedToken', () => {
  it('rotates access + refresh token and recomputes expiry', () => {
    const updated = applyRefreshedToken(
      credentials(),
      { access_token: 'new-access', expires_in: 3600, refresh_token: 'new-refresh' },
      NOW
    )
    const oauth = parseClaudeOauthBlob(updated!)!
    expect(oauth.accessToken).toBe('new-access')
    expect(oauth.refreshToken).toBe('new-refresh')
    expect(oauth.expiresAt).toBe(NOW + 3600 * 1000)
  })

  it('keeps the existing refresh token when the server does not rotate it', () => {
    const updated = applyRefreshedToken(
      credentials(),
      { access_token: 'new-access', expires_in: 3600 },
      NOW
    )
    expect(parseClaudeOauthBlob(updated!)!.refreshToken).toBe('old-refresh')
  })

  it('preserves unrelated top-level fields', () => {
    const raw = JSON.stringify({
      claudeAiOauth: { accessToken: 'a', refreshToken: 'r' },
      somethingElse: { keep: true }
    })
    const updated = applyRefreshedToken(raw, { access_token: 'b' }, NOW)
    expect(JSON.parse(updated!).somethingElse).toEqual({ keep: true })
  })

  it('splits scope string into scopes array', () => {
    const updated = applyRefreshedToken(
      credentials(),
      { access_token: 'b', scope: 'user:inference user:profile' },
      NOW
    )
    expect(parseClaudeOauthBlob(updated!)!.scopes).toEqual(['user:inference', 'user:profile'])
  })

  it('returns null when the response lacks an access token', () => {
    expect(applyRefreshedToken(credentials(), {}, NOW)).toBeNull()
    expect(applyRefreshedToken('not json', { access_token: 'b' }, NOW)).toBeNull()
  })
})

describe('refreshClaudeOauthCredentials', () => {
  it('never refreshes subscription credentials outside Claude Code', async () => {
    await expect(refreshClaudeOauthCredentials(credentials(), NOW)).resolves.toBeNull()
    await expect(
      refreshClaudeOauthCredentials(credentials({ refreshToken: undefined }), NOW)
    ).resolves.toBeNull()
  })
})

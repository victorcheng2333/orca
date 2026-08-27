import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClaudeRuntimeAuthPreparation } from '../claude-accounts/runtime-auth-service'
import { fetchClaudeRateLimits, fetchManagedAccountUsage } from './claude-fetcher'
import { fetchViaPty } from './claude-pty'

vi.mock('./claude-pty', () => ({ fetchViaPty: vi.fn() }))

const authPreparation: ClaudeRuntimeAuthPreparation = {
  configDir: '/Users/test/.claude',
  runtime: 'host',
  wslDistro: null,
  wslLinuxConfigDir: null,
  envPatch: {},
  stripAuthEnv: false,
  provenance: 'system'
}

describe('Claude usage P0 policy', () => {
  beforeEach(() => {
    vi.mocked(fetchViaPty)
      .mockReset()
      .mockResolvedValue({
        provider: 'claude',
        session: {
          usedPercent: 12,
          windowMinutes: 300,
          resetsAt: null,
          resetDescription: null
        },
        weekly: {
          usedPercent: 34,
          windowMinutes: 10080,
          resetsAt: null,
          resetDescription: null
        },
        updatedAt: 1,
        error: null,
        status: 'ok'
      })
  })

  it('fetches usage only through the official Claude Code client', async () => {
    await expect(fetchClaudeRateLimits({ authPreparation })).resolves.toMatchObject({
      provider: 'claude',
      status: 'ok',
      usageMetadata: {
        source: 'cli',
        attemptedSources: ['cli'],
        credentialSource: 'none',
        authProvenance: 'system'
      }
    })
    expect(fetchViaPty).toHaveBeenCalledWith({
      authPreparation,
      networkProxySettings: undefined,
      signal: undefined
    })
  })

  it('does not inspect credentials when CLI usage is unavailable to the caller', async () => {
    await expect(
      fetchClaudeRateLimits({ authPreparation, allowPtyFallback: false })
    ).resolves.toMatchObject({
      provider: 'claude',
      status: 'unavailable',
      usageMetadata: { attemptedSources: [], credentialSource: 'none' }
    })
    expect(fetchViaPty).not.toHaveBeenCalled()
  })

  it('disables inactive managed-account usage without reading its auth path', async () => {
    await expect(
      fetchManagedAccountUsage({ id: 'account-1', managedAuthPath: '/private/managed-auth' })
    ).resolves.toMatchObject({
      provider: 'claude',
      status: 'unavailable',
      error: 'Managed Claude account usage is disabled in this build.'
    })
    expect(fetchViaPty).not.toHaveBeenCalled()
  })

  it('fails closed when a WSL system config cannot be resolved', async () => {
    await expect(
      fetchClaudeRateLimits({
        authPreparation: {
          ...authPreparation,
          runtime: 'wsl',
          wslDistro: 'Ubuntu',
          wslLinuxConfigDir: null,
          stripAuthEnv: true,
          provenance: 'wsl:Ubuntu:system'
        }
      })
    ).resolves.toMatchObject({
      provider: 'claude',
      status: 'error',
      error: 'WSL Claude config unavailable for Ubuntu'
    })
    expect(fetchViaPty).not.toHaveBeenCalled()
  })
})

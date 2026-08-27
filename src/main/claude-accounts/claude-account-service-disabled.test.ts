import { describe, expect, it, vi } from 'vitest'
import { ClaudeAccountService } from './service'

describe('ClaudeAccountService disabled policy', () => {
  function createService(): ClaudeAccountService {
    return new ClaudeAccountService(
      {} as never,
      {} as never,
      { getRuntimeConfigDir: vi.fn(() => '/system/.claude') } as never,
      { managedAccountsEnabled: false }
    )
  }

  it('exposes only the system account and rejects credential mutations', async () => {
    const service = createService()

    expect(service.listAccounts()).toEqual({
      accounts: [],
      activeAccountId: null,
      activeAccountIdsByRuntime: { host: null, wsl: {} }
    })
    await expect(service.addAccount()).rejects.toThrow('Managed Claude subscription accounts')
    await expect(service.addAccountFromConfigDir('/tmp/claude')).rejects.toThrow(
      'Managed Claude subscription accounts'
    )
    await expect(service.selectAccount('account-1')).rejects.toThrow(
      'Managed Claude subscription accounts'
    )
    await expect(service.selectAccountForTarget('account-1', { runtime: 'host' })).rejects.toThrow(
      'Managed Claude subscription accounts'
    )
    await expect(service.reauthenticateAccount('account-1')).rejects.toThrow(
      'Managed Claude subscription accounts'
    )
    await expect(service.removeAccount('account-1')).rejects.toThrow(
      'Managed Claude subscription accounts'
    )
    await expect(service.selectAccount(null)).resolves.toEqual(service.listAccounts())
    await expect(service.selectAccountForTarget(null, { runtime: 'host' })).resolves.toEqual(
      service.listAccounts()
    )
    expect(service.cancelPendingLogin()).toBe(false)
  })
})

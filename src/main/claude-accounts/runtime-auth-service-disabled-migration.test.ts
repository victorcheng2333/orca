import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanupRuntimeAuthTestState,
  createClaudeAccount,
  createClaudeCredentialsJson,
  createElectronMock,
  createKeychainMock,
  createManagedClaudeAuth,
  createOauthRefreshMock,
  createSettings,
  createStore,
  resetRuntimeAuthTestState,
  setPlatform,
  testState
} from './runtime-auth-service-test-harness'

vi.mock('electron', () => createElectronMock())
vi.mock('./oauth-refresh', () => createOauthRefreshMock())
vi.mock('./keychain', () => createKeychainMock())
vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os') // eslint-disable-line @typescript-eslint/consistent-type-imports -- vi.importActual requires inline import()
  return { ...actual, homedir: () => testState.fakeHomeDir }
})

describe('ClaudeRuntimeAuthService disabled migration', () => {
  beforeEach(() => {
    resetRuntimeAuthTestState()
    setPlatform('linux')
  })

  afterEach(() => {
    cleanupRuntimeAuthTestState()
  })

  it('restores system auth, deletes managed credentials, and returns system preparation', async () => {
    const systemCredentials = createClaudeCredentialsJson('system@example.com', 'system')
    const managedCredentials = createClaudeCredentialsJson('managed@example.com', 'managed')
    const runtimeCredentialsPath = join(testState.fakeHomeDir, '.claude', '.credentials.json')
    writeFileSync(runtimeCredentialsPath, systemCredentials, 'utf-8')
    const managedAuthPath = createManagedClaudeAuth(
      testState.userDataDir,
      'account-1',
      managedCredentials
    )
    const settings = createSettings({
      claudeManagedAccounts: [
        createClaudeAccount('account-1', managedAuthPath, { email: 'managed@example.com' })
      ]
    })
    const store = createStore(settings)
    const { ClaudeRuntimeAuthService } = await import('./runtime-auth-service')
    const enabledService = new ClaudeRuntimeAuthService(store as never)
    await enabledService.prepareForClaudeLaunch()
    settings.activeClaudeManagedAccountId = 'account-1'
    await enabledService.syncForCurrentSelection()
    expect(readFileSync(runtimeCredentialsPath, 'utf-8')).toBe(managedCredentials)

    const disabledService = new ClaudeRuntimeAuthService(store as never, {
      managedAccountsEnabled: false
    })
    const preparation = await disabledService.prepareForClaudeLaunch()
    const migratedSettings = store.getSettings()

    expect(readFileSync(runtimeCredentialsPath, 'utf-8')).toBe(systemCredentials)
    expect(migratedSettings.claudeManagedAccounts).toEqual([])
    expect(migratedSettings.activeClaudeManagedAccountId).toBeNull()
    expect(migratedSettings.activeClaudeManagedAccountIdsByRuntime).toEqual({
      host: null,
      wsl: {}
    })
    expect(existsSync(join(managedAuthPath, '..'))).toBe(false)
    expect(
      existsSync(join(testState.userDataDir, 'claude-runtime-auth', 'system-default-auth.json'))
    ).toBe(false)
    expect(preparation).toMatchObject({
      provenance: 'system',
      stripAuthEnv: false
    })
  })
})

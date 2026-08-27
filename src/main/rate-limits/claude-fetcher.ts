import type { ProviderRateLimits } from '../../shared/rate-limit-types'
import { withMacTailscaleDnsHint } from '../network/macos-tailscale-dns-diagnostic'
import type { InactiveClaudeAccount } from './claude-managed-account-credentials'
import { fetchClaudeUsageViaCli } from './claude-cli-usage-fetch'
import type {
  ClaudeManagedAccountUsageOptions,
  ClaudeRateLimitFetchOptions
} from './claude-usage-fetch-options'
import {
  abortedClaudeRateLimitResult,
  makeClaudeUsageResult,
  metadataForClaudeUsageAttempt,
  warnClaudeUsageFetchFailure
} from './claude-usage-result'

export type FetchClaudeRateLimitsOptions = ClaudeRateLimitFetchOptions
export type FetchManagedAccountUsageOptions = ClaudeManagedAccountUsageOptions
export type InactiveClaudeAccountInfo = InactiveClaudeAccount

export async function fetchClaudeRateLimits(
  options?: FetchClaudeRateLimitsOptions
): Promise<ProviderRateLimits> {
  if (options?.signal?.aborted) {
    return abortedClaudeRateLimitResult()
  }
  if (options?.authPreparation?.runtime === 'wsl' && !options.authPreparation.wslLinuxConfigDir) {
    return makeClaudeUsageResult(
      'error',
      `WSL Claude config unavailable for ${options.authPreparation.wslDistro ?? 'default distro'}`,
      {
        attemptedSources: [],
        failureKind: 'cli-unavailable',
        credentialSource: 'none',
        authProvenance: options.authPreparation.provenance
      }
    )
  }

  const attempts = { attemptedSources: [] }
  const oauthCredentials = {
    token: null,
    hasRefreshableCredentials: false,
    source: 'none' as const
  }
  if (options?.allowPtyFallback === false) {
    return makeClaudeUsageResult(
      'unavailable',
      'Claude usage is available only through the official Claude Code client.',
      metadataForClaudeUsageAttempt({
        attemptedSources: attempts.attemptedSources,
        oauthCredentials,
        authPreparation: options.authPreparation,
        failureKind: 'usage-unavailable'
      })
    )
  }

  try {
    return await fetchClaudeUsageViaCli({
      authPreparation: options?.authPreparation,
      oauthCredentials,
      attempts,
      networkProxySettings: options?.networkProxySettings,
      signal: options?.signal
    })
  } catch (error) {
    warnClaudeUsageFetchFailure(options?.authPreparation, oauthCredentials, error)
    return makeClaudeUsageResult(
      'error',
      withMacTailscaleDnsHint(error instanceof Error ? error.message : 'Unknown error'),
      metadataForClaudeUsageAttempt({
        attemptedSources: attempts.attemptedSources,
        oauthCredentials,
        authPreparation: options?.authPreparation,
        failureKind: 'cli-unavailable'
      })
    )
  }
}

export async function fetchManagedAccountUsage(
  _account: InactiveClaudeAccountInfo,
  options: FetchManagedAccountUsageOptions = {}
): Promise<ProviderRateLimits> {
  if (options.signal?.aborted) {
    return abortedClaudeRateLimitResult()
  }
  return makeClaudeUsageResult(
    'unavailable',
    'Managed Claude account usage is disabled in this build.',
    {
      attemptedSources: [],
      failureKind: 'usage-unavailable',
      credentialSource: 'none',
      authProvenance: 'system'
    }
  )
}

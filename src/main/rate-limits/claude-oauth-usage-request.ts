import type { ProviderRateLimits } from '../../shared/rate-limit-types'
import { abortedClaudeRateLimitResult } from './claude-usage-result'

export async function fetchClaudeOAuthUsage(
  _token: string,
  signal?: AbortSignal
): Promise<ProviderRateLimits> {
  if (signal?.aborted) {
    return abortedClaudeRateLimitResult()
  }
  return {
    provider: 'claude',
    session: null,
    weekly: null,
    fableWeekly: null,
    updatedAt: Date.now(),
    error: 'Direct Claude OAuth usage requests are disabled.',
    status: 'unavailable'
  }
}

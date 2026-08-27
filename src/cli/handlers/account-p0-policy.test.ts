import { describe, expect, it, vi } from 'vitest'
import type { HandlerContext } from '../dispatch'
import type { RuntimeClient } from '../runtime-client'
import { ACCOUNT_HANDLERS } from './account'

describe('account CLI P0 policy', () => {
  it('rejects managed Claude login before contacting the runtime', async () => {
    const call = vi.fn()
    const context: HandlerContext = {
      client: { call } as unknown as RuntimeClient,
      cwd: process.cwd(),
      flags: new Map([['agent', 'claude']]),
      json: false,
      rawArgs: []
    }

    await expect(ACCOUNT_HANDLERS['account add'](context)).rejects.toThrow(
      'Managed Claude subscription accounts are disabled'
    )
    expect(call).not.toHaveBeenCalled()
  })
})

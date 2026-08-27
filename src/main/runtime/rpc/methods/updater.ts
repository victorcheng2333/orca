import { defineMethod, type RpcMethod } from '../core'
import { z } from 'zod'
import { OFFICIAL_UPDATES_DISABLED_MESSAGE } from '../../../../shared/official-update-policy'
import { getRemoteServerUpdaterSnapshot } from '../../remote-server-updater'

function rejectOfficialUpdate(): never {
  throw new Error(OFFICIAL_UPDATES_DISABLED_MESSAGE)
}

export const UPDATER_METHODS: RpcMethod[] = [
  defineMethod({
    name: 'updater.getStatus',
    params: null,
    handler: (_params, { runtime }) => getRemoteServerUpdaterSnapshot(runtime.getRuntimeId())
  }),
  defineMethod({
    name: 'updater.check',
    params: z.object({
      includePrerelease: z.boolean().optional(),
      includePerfPrerelease: z.boolean().optional()
    }),
    handler: rejectOfficialUpdate
  }),
  defineMethod({
    name: 'updater.download',
    params: null,
    handler: rejectOfficialUpdate
  }),
  defineMethod({
    name: 'updater.install',
    params: null,
    handler: rejectOfficialUpdate
  })
]

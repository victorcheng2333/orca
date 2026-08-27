import { GLOBAL_FLAGS, type CommandSpec } from '../args'

// Why: the desktop "Add account" button is disabled when the UI drives a remote
// runtime (a headless server). This command runs Codex device login in the
// caller's own terminal and registers the account with the local runtime.
export const ACCOUNT_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['account', 'add'],
    summary: 'Add a managed Codex account by signing in on this Orca host',
    usage: 'orca account add [--agent codex] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'agent'],
    notes: [
      'Runs `codex login` in this terminal, then registers the account with the local Orca runtime.',
      'Codex uses device authorization so the browser can complete sign-in from a different machine.',
      'Sign in with the account you want to add (e.g. use a private/incognito browser window for a second account).',
      'Claude authentication is managed only by the official Claude Code client.',
      '--agent defaults to codex. Requires the Orca runtime to be running on this machine.'
    ],
    examples: ['orca account add', 'orca account add --agent codex']
  },
  {
    path: ['account', 'list'],
    summary: 'List managed provider accounts on this Orca host',
    usage: 'orca account list [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    notes: [
      'Lists the accounts on this machine. `--environment` / `--pairing-code` are rejected rather than ignored; run it on the host whose accounts you want to see.'
    ],
    examples: ['orca account list']
  }
]

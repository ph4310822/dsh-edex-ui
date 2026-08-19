import { clientLibrary } from '../../tsdown.client.ts'

// Host node half: bundle the tsc output (lib/types) into the loader entry.
// Runtime deps (cordis, typert-protocol) stay external; the typert artifacts
// are generated separately inside the harness workspace.
export default clientLibrary('@deepseek-ai/dsh-host-system-metrics', [
  'lib/types/index.js',
  'lib/types/invariant.js',
])

import { clientBundle } from '../tsdown.client.ts'

// Theme package: node half + browser bundle, both built from src (no tsc
// pass needed — the node half is a no-op and the browser half is the bundle).
export default clientBundle('@deepseek-ai/dsh-client-ui-theme-terminal', [], {
  lib: { entry: { index: 'src/index.ts' } },
})

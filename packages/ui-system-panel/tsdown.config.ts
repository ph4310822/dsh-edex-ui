import { clientBundle } from '../tsdown.client.ts'

// System panel: node half + browser bundle, both built from src.
export default clientBundle('@deepseek-ai/dsh-client-ui-system-panel', [], {
  lib: { entry: { index: 'src/index.ts' } },
})

import { clientBundle } from '../tsdown.client.ts'

// Sidebar clock: node half + browser bundle, both built from src.
export default clientBundle('@deepseek-ai/dsh-client-ui-sidebar-clock', [], {
  lib: { entry: { index: 'src/index.ts' } },
})

import { clientBundle } from '../tsdown.client.ts'

// CRT frame: node half + browser bundle, both built from src.
export default clientBundle('@deepseek-ai/dsh-client-ui-crt-frame', [], {
  lib: { entry: { index: 'src/index.ts' } },
})

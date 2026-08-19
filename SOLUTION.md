# Root Cause: Missing Workspace Dependencies

## Error message
pnpm dsh web    
[WARN] Unsupported engine: wanted: {"node":"^22.19.0 || >=24.0.0"} (current: {"node":"v23.9.0","pnpm":"11.7.0"})
$ node --import tsx/esm apps/cli/src/bin.ts web
/Users/daniel/workspace/deepseek-harness/packages/boot/app-boot/src/index.ts:800
    throw new Error(`${binName}: ${stage}: ${detail}${stack}`, { cause })
          ^


Error: dsh: plugin tree failed to load: failed to apply loader entry include (cordis:include): failed to import loader entry ui-terminal-console (@deepseek-ai/dsh-client-ui-terminal-console): Cannot find package 'react' imported from /Users/daniel/workspace/dsh-edex-ui/packages/ui-terminal-console/lib/SessionStrip.js
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'react' imported from /Users/daniel/workspace/dsh-edex-ui/packages/ui-terminal-console/lib/SessionStrip.js
    at Object.getPackageJSONURL (node:internal/modules/package_json_reader:267:9)
    at packageResolve (node:internal/modules/esm/resolve:768:81)
    at moduleResolve (node:internal/modules/esm/resolve:854:18)
    at defaultResolve (node:internal/modules/esm/resolve:984:11)
    at nextResolve (node:internal/modules/esm/hooks:748:28)
    at resolveBase (file:///Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/register-CqMfTiWi.mjs:2:8141)
    at resolveDirectory (file:///Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/register-CqMfTiWi.mjs:2:9227)
    at resolveTsPaths (file:///Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/register-CqMfTiWi.mjs:2:10757)
    at resolve2 (file:///Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/register-CqMfTiWi.mjs:2:11938)
    at nextResolve (node:internal/modules/esm/hooks:748:28)
    at boot (/Users/daniel/workspace/deepseek-harness/packages/boot/app-boot/src/index.ts:800:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async runProfile (/Users/daniel/workspace/deepseek-harness/apps/cli/src/profile-boot.ts:248:15)
    at async <anonymous> (/Users/daniel/workspace/deepseek-harness/apps/cli/src/bin.ts:32:5) {
  [cause]: Error: failed to apply loader entry include (cordis:include): failed to import loader entry ui-terminal-console (@deepseek-ai/dsh-client-ui-terminal-console): Cannot find package 'react' imported from /Users/daniel/workspace/dsh-edex-ui/packages/ui-terminal-console/lib/SessionStrip.js
      at updateError (/Users/daniel/workspace/deepseek-harness/vendor/loader/src/config/entry.ts:26:10)
      at Entry._init (/Users/daniel/workspace/deepseek-harness/vendor/loader/src/config/entry.ts:287:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5) {
    [cause]: Error: failed to import loader entry ui-terminal-console (@deepseek-ai/dsh-client-ui-terminal-console): Cannot find package 'react' imported from /Users/daniel/workspace/dsh-edex-ui/packages/ui-terminal-console/lib/SessionStrip.js
        at updateError (/Users/daniel/workspace/deepseek-harness/vendor/loader/src/config/entry.ts:26:10)
        at Entry._init (/Users/daniel/workspace/deepseek-harness/vendor/loader/src/config/entry.ts:282:13) {
      [cause]: Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'react' imported from /Users/daniel/workspace/dsh-edex-ui/packages/ui-terminal-console/lib/SessionStrip.js
          at Object.getPackageJSONURL (node:internal/modules/package_json_reader:267:9)
          at packageResolve (node:internal/modules/esm/resolve:768:81)
          at moduleResolve (node:internal/modules/esm/resolve:854:18)
          at defaultResolve (node:internal/modules/esm/resolve:984:11)
          at nextResolve (node:internal/modules/esm/hooks:748:28)
          at resolveBase (file:///Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/register-CqMfTiWi.mjs:2:8141)
          at resolveDirectory (file:///Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/register-CqMfTiWi.mjs:2:9227)
          at resolveTsPaths (file:///Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/register-CqMfTiWi.mjs:2:10757)
          at resolve2 (file:///Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/register-CqMfTiWi.mjs:2:11938)
          at nextResolve (node:internal/modules/esm/hooks:748:28) {
        code: 'ERR_MODULE_NOT_FOUND'
      }
    }
  }
}

Node.js v23.9.0
[ELIFECYCLE] Command failed with exit code 1.

## The Real Problem

Your plugin imports from `@deepseek-ai/dsh-client-runtime` in the source code:

```typescript
// packages/client/src/client/stores.ts
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
```

But this package lives in the **harness** workspace at `/Users/daniel/workspace/deepseek-harness`, not in your **plugin** workspace at `/Users/daniel/workspace/dsh-edex-ui`.

This is different from React:
- **React**: Externalized completely, provided by harness at runtime only
- **dsh-client-runtime**: Needed at build time for types/functions, AND provided at runtime

## The Error Chain

1. `pnpm run build` tries to install dependencies
2. Finds `"@deepseek-ai/dsh-client-runtime": "workspace:^"` in package.json
3. Looks for it in the current workspace (dsh-edex-ui/packages/*)
4. Can't find it → build fails
5. Bundle never gets created → harness can't load it
6. Even if bundle existed, it would fail at runtime with "require('react') missed the module table"

## Solution: Link the Harness Packages

You have three options:

### Option 1: Use pnpm catalog (Recommended)

Create a shared catalog that both workspaces reference:

```bash
cd /Users/daniel/workspace/deepseek-harness
pnpm link --global
```

Then in your plugin workspace, link to the harness packages:

```bash
cd /Users/daniel/workspace/dsh-edex-ui
pnpm link --global @deepseek-ai/dsh-client-runtime
```

### Option 2: Use pnpm workspace protocol with absolute path

Modify `packages/client/package.json`:

```json
"dependencies": {
  "@deepseek-ai/dsh-client-runtime": "link:../../../deepseek-harness/packages/client/runtime"
}
```

### Option 3: Monorepo setup (Most proper)

Move your plugin INTO the harness workspace as a sibling package, then the workspace dependencies will resolve naturally.

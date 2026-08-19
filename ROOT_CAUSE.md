# Root Cause Found: Harness Not Built

## The Problem

Your plugin cannot find React because **the DeepSeek Harness itself is not built**.

The harness's module table (which provides React, Cordis, and other platform modules to plugins) only exists when:
1. The harness is built
2. The web server is running
3. The browser loads the page and executes the boot sequence

## Evidence

```bash
$ ./scripts/check-harness.sh
❌ Harness is not built
   Run: cd /Users/daniel/workspace/deepseek-harness && pnpm install && pnpm run build
```

The harness at `/Users/daniel/workspace/deepseek-harness` doesn't have its compiled artifacts (like `packages/client/web/lib/seed.js`).

## Why This Matters

The error you're seeing:
```
client-modules: require("react") missed the module table
```

...happens because:

1. **Your plugin IS correctly configured** - it externalizes React and expects it from the module table
2. **The module table doesn't exist** - because the harness web app hasn't been built and isn't running
3. **When you try to load your plugin** - either in tests or in isolation - there's no `window.__ModuleLoader__` with a seeded table

## The Solution

### Step 1: Build the harness

```bash
cd /Users/daniel/workspace/deepseek-harness
pnpm install
pnpm run build
```

This will:
- Compile all harness packages
- Build the web client bundle
- Generate the module system code that seeds React into the table

### Step 2: Start the web server

```bash
cd /Users/daniel/workspace/deepseek-harness
pnpm dsh web --port 3081
```

This will:
- Boot the web server
- Initialize the module system
- Create `window.__ModuleLoader__` with React in the seed table
- Make the module table available to plugins

### Step 3: Install your plugin

```bash
cd /Users/daniel/workspace/deepseek-harness
pnpm dsh plugin --profile web add file:///Users/daniel/workspace/dsh-edex-ui/packages/client
```

### Step 4: Verify in browser

Open http://127.0.0.1:3081 and check the console:

```javascript
// Should return the ClientModuleSystem instance
window.__DSH_MODULES__

// Should return true
window.__DSH_MODULES__.seed.has('react')

// Should return the React object
window.__DSH_MODULES__.seed.get('react')
```

## Why Your Plugin Build Works

Your plugin's bundle build succeeds because:
- **tsdown** externalizes React at build time (doesn't try to bundle it)
- The bundle expects React to come from `require('react')` at **runtime**
- Build time doesn't need React available - only runtime does

## The Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Browser Page (http://127.0.0.1:3081)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. HTML loads with window.__DSH_BOOT__ (plugin graph)      │
│                                                              │
│  2. Shell bundle executes (packages/client/web/lib/*.js)    │
│                                                              │
│  3. AppWebEntry.run() creates ClientModuleSystem:           │
│     ┌──────────────────────────────────────────────┐       │
│     │ ClientModuleSystem                           │       │
│     │  seed: Map {                                 │       │
│     │    'react' => [React instance],              │       │
│     │    'react-dom' => [ReactDOM instance],       │       │
│     │    '@deepseek-ai/cordis' => [Cordis],        │       │
│     │    ...                                        │       │
│     │  }                                            │       │
│     │  factories: Map {} (empty until plugins load)│       │
│     └──────────────────────────────────────────────┘       │
│                                                              │
│  4. window.__ModuleLoader__.load() becomes available        │
│                                                              │
│  5. Each plugin bundle fetches and executes:                │
│     window.__ModuleLoader__.load({                          │
│       id: '@pkg/name',                                      │
│       factory: (require) => {                               │
│         const React = require('react') // ← finds it in seed│
│         return module.exports                               │
│       }                                                      │
│     })                                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Without the harness running, steps 1-4 never happen, so step 5 fails.

## What You Were Probably Doing

Based on the error, you were likely:

1. ✅ Building your plugin: `pnpm run bundle` in dsh-edex-ui
2. ❌ Testing it in isolation without the harness running
3. ❌ Or trying to run it through a harness that wasn't built

## Next Steps

1. **Build the harness** (30-60 seconds):
   ```bash
   cd ../deepseek-harness && pnpm install && pnpm run build
   ```

2. **Start the server**:
   ```bash
   cd ../deepseek-harness && pnpm dsh web --port 3081
   ```

3. **Check the browser console** - verify React is in the seed table

4. **Install your plugin** and reload

The error should disappear once the harness is running and providing the module table.

# Module Loader Analysis: Why React is Not Available

## Architecture Overview

The DeepSeek Harness uses a **lazy CJS module table system** for loading plugins:

1. **Module Table Seeding** (`packages/client/web/src/seed.ts`)
   - Platform modules (React, Cordis, etc.) are imported statically in the shell
   - `getStaticModules()` creates a table mapping specifier → module instance
   - This table is passed to `ClientModuleSystem` at boot time

2. **Module System Initialization** (`packages/client/web/src/boot.tsx`)
   ```typescript
   this.modules = new ClientModuleSystem({
     modules: this.manifest.modules,
     staticModules: getStaticModules(),  // <-- React is here
     ...this.seams,
   })
   ```

3. **Plugin Bundle Format** (`packages/tsdown.client.ts`)
   - Each plugin bundle wraps as:
     ```javascript
     window.__ModuleLoader__.load({
       id: "@package/name",
       factory: (require) => {
         // Bundle code here
         // require('react') should resolve from module table
         return module.exports;
       }
     });
     ```

4. **Resolution Order** (`packages/client/modules/src/client/system.ts`, line 142-156)
   ```typescript
   private makeRequire(edges: Set<string>): (spec: string) => unknown {
     return (spec: string): unknown => {
       edges.add(spec)
       if (this.seed.has(spec)) return this.seed.get(spec)  // <-- React should be here
       if (this.statics.has(spec)) return this.statics.get(spec)
       const id = stripClientSuffix(spec)
       const record = this.loadCache.get(id)
       if (record !== undefined) return record.exports
       if (this.factories.has(id)) return this.materialize(id).exports
       throw new Error(...)  // <-- This is what you're seeing
     }
   }
   ```

## The Problem

When your plugin's factory calls `require('react')`, the module table lookup fails because:

**The `seed` map doesn't contain React at the time your plugin loads.**

## Root Cause Investigation

The issue is **NOT** in your plugin. The problem is in the harness initialization. Here's what to check:

### 1. Is the harness actually running?

Check if the web server is properly initialized:

```bash
cd ../deepseek-harness
pnpm dsh web --port 3081
```

Look for:
- ✅ `dsh web: http://127.0.0.1:3081`
- ❌ Any errors about missing modules or boot failures

### 2. Is the boot manifest present?

The harness injects `window.__DSH_BOOT__` with the plugin graph. Check the main HTML:

```bash
curl -s http://127.0.0.1:3081/ | grep -o '__DSH_BOOT__'
```

If this returns nothing, the harness isn't generating the boot manifest.

### 3. Is your plugin in the boot graph?

```bash
curl -s http://127.0.0.1:3081/ | grep '@deepseek-ai/dsh-client-ui-terminal'
```

### 4. Are the platform modules being seeded?

The problem might be that `getStaticModules()` is failing or returning an empty object.

Check the built harness files:
```bash
ls -la ../deepseek-harness/packages/client/web/lib/
cat ../deepseek-harness/packages/client/web/lib/seed.js
```

## Most Likely Causes

### Cause 1: Harness Not Built
```bash
cd ../deepseek-harness
pnpm install
pnpm run build
```

### Cause 2: Harness Not Running
The module table is created when the web app boots. If you're trying to test your plugin bundle in isolation (not through the running harness), it won't work.

### Cause 3: Wrong Import in Plugin
Your plugin might be importing from the wrong path. Check your plugin's built bundle:

```bash
cat packages/client/lib/client.js | grep -A 5 "require.*react"
```

### Cause 4: Build Artifact Mismatch
The `tsdown.client.ts` config expects specific externals. Check if your plugin's tsdown config matches:

```typescript
external: [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  // ... other platform modules
]
```

## How to Debug

### Step 1: Verify the harness runs standalone

```bash
cd ../deepseek-harness
pnpm dsh web --port 3081
# Open browser to http://127.0.0.1:3081
# Open DevTools Console
# Type: window.__DSH_BOOT__
# Should see: {rev: "...", entries: [...]}
# Type: window.__ModuleLoader__
# Should see: {load: ƒ}
```

### Step 2: Check if React is in the seed

```javascript
// In browser console
window.__DSH_MODULES__.seed.has('react')  // Should be true
window.__DSH_MODULES__.seed.get('react')  // Should show React object
```

### Step 3: Install your plugin into the profile

From LOCAL_DEVELOPMENT.md:
```bash
# From harness directory
pnpm dsh plugin --profile web add file:/absolute/path/to/dsh-edex-ui/packages/client

# Verify
pnpm dsh --profile web --dump-config

# Run
pnpm dsh web --port 3081
```

### Step 4: Check browser console for errors

When the harness loads your plugin, you should see either:
- ✅ Plugin loads silently (success)
- ❌ Error about `require("react")` missing from module table
- ❌ Error about bundle failing to register

## Next Steps

1. **Verify the harness is built and running**
   ```bash
   cd ../deepseek-harness
   pnpm run build
   pnpm dsh web --port 3081
   ```

2. **Check what's in the browser**
   - Open http://127.0.0.1:3081
   - Open DevTools Console
   - Run: `window.__DSH_MODULES__.seed`
   - Check if React is there

3. **If React is missing from seed**, the problem is in `packages/client/web/src/seed.ts` or the build chain

4. **If React is present in seed**, but your plugin still can't access it:
   - Check your plugin bundle format
   - Verify the `window.__ModuleLoader__.load()` wrapper
   - Check if your plugin is being loaded through the official loader vs some other path

## The Real Question

**Is the DeepSeek Harness web server actually running when you see this error?**

The module table only exists at runtime, in the browser, after `AppWebEntry.run()` completes. If you're seeing this error:

- **During build time**: This is expected - the build doesn't need React available
- **During tests without a web server**: You need to mock the module table
- **In a running browser with the harness**: Something is wrong with the harness initialization

Let me know which scenario you're in!

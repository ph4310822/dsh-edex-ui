# Developing & testing DeepSeek Harness plugins locally

A general-purpose guide for building and testing a **standalone (external) DSH
plugin** against a local `deepseek-harness` checkout **before publishing to
npm** — without modifying the harness repository. It covers host plugins,
plugins with a browser (client) half, and plugins that expose a Typert Remote
RPC surface, and it documents the pitfalls that are otherwise only discoverable
by trial and error.

The [dsh-x402-wallet](https://github.com/ph4310822/dsh-x402-wallet) repository
is the worked example: its `packages/` and `scripts/` implement everything
described here.

## Concepts in one paragraph

A DSH plugin ships as one or more npm packages. The **host** package runs on
the server (tools, services, a `cordis.yml`-loaded plugin entry). A package
with a GUI half declares `dsh.client` and ships a **prebuilt browser bundle**
that the harness's client-module system serves to the page. A package that
exposes RPC to the GUI ships a generated **Typert** host face (`./typert`) and
client contribution (`./remote`). An **installable bundle** package wraps all
of it in a `cordis.patch.yml` layer (`dsh.bundle`), which is what
`dsh plugin --profile <name> add <package>` activates. Users install the bundle
into a profile; the harness composes the layers and boots.

## Prerequisites

- A `deepseek-harness` checkout built from source (`pnpm run build`); you run
  the CLI from it as `pnpm dsh ...` (there is no global `dsh` unless you
  installed one).
- Node `^22.19.0 || >=24.0.0`, pnpm on PATH.
- A plugin repo with a pnpm workspace (`packages/*`) and a build script
  (`tsc -b <pkgs> && tsdown`).

Everything in this guide writes only to `~/.dsh` (profile data) and your own
repo — **the harness checkout is never modified.**

---

## 1. Make `pnpm install` / `pnpm build` work (the #1 pitfall)

**Symptom.** `pnpm install` fails with a 404 for some `@deepseek-ai/...`
package (e.g. `@deepseek-ai/dsh-type-meta`).

**Cause.** pnpm auto-installs `peerDependencies` from npm by default, but the
npm-published `@deepseek-ai` packages are partial and sometimes broken (one
published rc depends on a package that was never released). The `@deepseek-ai`
packages you need are developed **in the harness checkout**, not on npm.

**Fix.**

1. In your repo's `pnpm-workspace.yaml` (pnpm ≥10 reads settings here, **not**
   `.npmrc`):

   ```yaml
   packages:
     - 'packages/*'
   autoInstallPeers: false
   ```

2. For build-time *type* resolution, symlink the harness packages into
   `node_modules/@deepseek-ai` (pnpm does not prune stray symlinks — verified).
   This repository ships `scripts/link-harness.sh`, which links every
   `@deepseek-ai/*` package (plus the vendored `@deepseek-ai/cordis` and
   `@deepseek-ai/schemastery`) from a sibling checkout:

   ```sh
   # after `pnpm install`; idempotent; DSH_HARNESS overrides the default ../deepseek-harness
   ./scripts/link-harness.sh
   ```

   **Runtime is unaffected:** the harness's profile fallback
   (`$DSH_HOME/profiles/node_modules`) provides `@deepseek-ai/*` when the
   plugin actually runs, because `dsh` creates every profile with
   `autoInstallPeers: false` + `nodeLinker: hoisted`. The symlinks exist only
   so tsc/tsdown can see the types.

---

## 2. TypeScript build conventions (mirror the harness)

The harness's own `tsconfig.base.json` is the reference; mirror its flags so
your source compiles the same way and the emitted `lib/` matches what the
harness expects at runtime.

`tsconfig.base.json` essentials:

```jsonc
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "target": "es2024",
    "lib": ["es2024", "dom", "dom.iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    // Sources import siblings with explicit .ts/.tsx extensions; tsc rewrites
    // them to .js in emit.
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    // Published packages ship declarations (package.json types -> lib/types/...).
    "declaration": true,
    "declarationMap": true,
    "incremental": true,
    "types": ["node"]
  }
}
```

Per-package `tsconfig.json` (host and client packages):

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "lib/types" },
  "include": ["src"]
}
```

- **Client packages** override `"types": []` (no Node globals; JSX types come
  from the `react`/`@types/react` devDependencies).
- **Cross-package imports** resolve against the *built* declarations so a
  package build never pulls another package's source across its `rootDir`
  boundary. Map them in `paths` (e.g. `"@you/dsh-x": ["./packages/host/lib/types/index.d.ts"]`),
  and build in dependency order (`tsc -b packages/host && tsc -b packages/ui`).
- **Value imports across packages** (e.g. a client bundle importing a sibling's
  generated `/remote`): declare the sibling as a `devDependency` with a
  `link:` spec (e.g. `"@you/dsh-x": "link:../host"`) so bundlers resolve the
  real package, and **do not** map that subpath in `paths` — a `paths` entry
  pointing at a `.d.ts` makes rolldown bundle a declaration file
  (`Missing export`).
- devDependencies to add: `typescript`, `tsdown`, `tsx`, `vitest`,
  `@types/node`; plus `react` + `@types/react` (matching the harness's React
  18 types) for client code.

Build script shape:

```json
"build": "tsc -b packages/host && tsc -b packages/ui && tsdown"
```

with a root `tsdown.config.ts` in workspace mode (`workspace: ['packages/host',
'packages/ui']`, `entry: ['lib/types/{index,invariant}.js']`, `outDir: 'lib'`,
`format: ['esm']`, `platform: 'node'`, `clean: false`) that bundles each
package's tsc output. Package-local configs replace the root defaults for that
package.

---

## 3. The browser bundle (client half)

The harness's `clientBundle` preset is **not published** — the cookbook states
external packages must reproduce its output format. The contract (see
`packages/ui/tsdown.config.ts` in this repo for a working reproduction):

- **Loader handoff.** The bundle must start with
  `window.__ModuleLoader__.load({ id: <exact published package name>, factory: (require) => {`
  and end with `return module.exports; } });` plus the
  `var module = { exports: {} }; var exports = module.exports;` intro. The
  `id` must equal the package name **exactly** — the runtime rejects a
  mismatch (`bundle ... loaded without registering "<id>"`).
- **Externals** — resolved from the page's loader module table, never bundled:
  `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`,
  `@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-ui-slots`,
  `@deepseek-ai/dsh-client-web-react`, `@deepseek-ai/dsh-client-ui-primitives`,
  `@deepseek-ai/dsh-client-ui-attachment`,
  `@deepseek-ai/dsh-client-schema-form`, plus
  `@deepseek-ai/dsh-client-runtime/client`. Everything else inlines
  (`noExternal: (id) => externals.includes(id) ? undefined : true`).
- **Purity gate.** Any other `@deepseek-ai/*` *value* import is a build error;
  generated `/remote` contributions from your own scope inline (theirs are
  self-contained descriptor lists).
- **CSS modules.** Compile `*.module.css` via lightningcss
  (`cssModules: { pattern: '[hash]_[local]' }`), emit the class map as the
  default export, and inject one `<style data-plugin data-plugin-css>` tag per
  module.
- **Output.** `format: 'cjs'`, `platform: 'browser'`, `entryFileNames:
  'client.js'` → `lib/client.js`, which **ships prebuilt** in the npm package
  (`files`).

---

## 4. Typert Remotes (host RPC surface for the GUI)

If your host exposes methods the browser calls (`ctx.remote.<ns>.<method>`),
two generated artifacts are involved:

- Host face: `package.json` exports `./typert` → `lib/typert.host.js`
  (a `TYPERT` manifest). The harness's **typert-loader** imports it and
  registers the endpoints into the gateway. The manifest's `package` field
  must equal the package's npm name — the loader rejects an ownership
  mismatch, and the endpoint then answers **HTTP 404**.
- Client contribution: exports `./remote` → `lib/typert.remote-client.js`
  (a `TYPERT_REMOTE` contribution). Your client code mounts it with
  `ctx.remote.$mount(contribution)`.

Two traps:

1. **Mount and consume in one fiber?** Do not put `remote.<ns>` in `inject`
   (it would wait on a service only your own `apply` creates — a permanent
   PENDING entry), and do not read `ctx.remote.<ns>` either: cordis wraps
   services in traceable proxies that re-dispatch such reads as traced
   `ctx['remote.<ns>']` lookups requiring `inject`
   (`cannot get property "remote.<ns>" without inject`). Mount the
   contribution in `apply` (after `await ctx.remote.$mount(...)`), then read
   the namespace once via the non-traced store lookup and reuse that handle:

   ```ts
   const ns = ctx.get('remote.<ns>') as typeof ctx.remote.<ns>
   // later: ns.method(...)
   ```

   (This is the harness's own documented pattern — post-mortem 0001.)
2. **The generator cannot run outside the harness workspace.** The harness's
   typert generator only recognizes `@deepseek-ai/dsh-typert-protocol` symbols
   when that package is a *registration under `<root>/packages`*; for an
   external package it reports "no Remote methods". So commit the generated
   artifacts and maintain them by hand: regenerate inside the harness
   workspace when the `@Remote` surface changes, copy `lib/` back, and run a
   scope-repoint pass. This repo ships `scripts/repoint-typert.mjs` for the
   rename case (the artifacts must reference your package's real name in the
   `package` field and manifest symbol IDs).

---

## 5. Install into a profile and run

```sh
# 1. build your packages
cd /path/to/your-plugin && pnpm build

# 2. install the local bundle checkout into the web profile
#    (from the harness checkout; the `file:` prefix is REQUIRED)
cd /path/to/deepseek-harness
pnpm dsh plugin --profile web add file:/absolute/path/to/your-plugin/packages/bundle

# 3. verify the layer composes without booting
pnpm dsh --profile web --dump-config   # look for "# == <your-bundle>"

# 4. boot on a non-default port (default is 3080) — use a SCRATCH PORT so the
#    test instance never clashes with a server you already run on 3080
pnpm dsh web --port 3083               # open http://127.0.0.1:3083, hard-refresh (⌘⇧R)
```

Why `file:`: a bare path is recorded as pnpm `link:`, which **skips installing
the bundle's dependencies** (your host/ui packages and their runtime deps never
land in the profile's `node_modules` and the boot cannot resolve them).

Verification:

- A clean boot prints `dsh web: http://127.0.0.1:<port>` and no
  `did not activate` error. The boot audit throws on any pending/failed entry,
  so a running server means the tree settled.
- Client half: `curl -s http://127.0.0.1:<port>/ | grep <your-id>` shows the
  entry in `window.__DSH_BOOT__`, and the served bundle's
  `__ModuleLoader__.load({ id: ... })` matches the graph entry id.
- RPC endpoints: probe the wire directly (the message shape is
  `{"type":"client-request","rpcId":"...","method":"<ns>/<method>","payload":{"args":{}}}`):

  ```sh
  curl -s -X POST http://127.0.0.1:3081/api/<ns>/<method> \
    -H 'content-type: application/json' \
    -d '{"type":"client-request","rpcId":"probe","method":"<ns>/<method>","payload":{"args":{}}}'
  ```

  A validation error past the route check means the endpoint is registered; a
  plain `not found` means it is not.

> **Port hygiene.** If the boot dies with `listen EADDRINUSE`, a previous run's
> `node` child is still holding the port (killing the `pnpm` wrapper does not
> always take the child down). Check `lsof -iTCP:<port> -sTCP:LISTEN` and kill
> the actual node pid before booting again.

---

## 6. Iteration loop

Profile installs are **copies**, not symlinks. After editing sources:

```sh
cd /path/to/your-plugin && pnpm build
cd ~/.dsh/profiles/<name> && pnpm install   # re-copies the rebuilt lib/ from the checkout
# then restart: cd /path/to/deepseek-harness && pnpm dsh web --port 3083
```

A stale profile copy is the usual cause of `loaded without registering`
(loader-id mismatch) or a missing GUI — always refresh the profile after a
rebuild. Restarting the server after the refresh matters too: the page caches
client bundles by boot-time `__DSH_BOOT__` rev hashes, so an old server keeps
serving the old bundle even though the files on disk changed.

> **`pnpm install` can silently skip a rebuilt `file:` dependency.** pnpm
> considers a `file:` dep up to date from the lockfile's recorded state, so
> after a rebuild the plain install prints "Already up to date" and leaves the
> OLD bundle in the profile. Verify the copy actually changed (or byte-compare
> it against the checkout), and if it did not, force a re-copy:
>
> ```sh
> rm -rf node_modules/@deepseek-ai/<your-bundle> node_modules/@deepseek-ai/<your-ui> node_modules/@deepseek-ai/<your-host>
> pnpm install
> ```
>
> Removing the installed dirs makes pnpm re-copy every `file:` dep from the
> checkout; re-running plain `pnpm install` on a dir that was already refreshed
> is a no-op, so the rm is the reliable refresh.

---

## 7. GUI smoke-testing on a scratch port (Playwright)

A booting server is not a working GUI. Client-side failures — a bundle that
throws while loading, a `/remote` contribution the page cannot resolve, a
stale profile copy — pass `curl` checks and only surface in the browser. The
reliable loop is to run the same installed profile on a **scratch port** and
drive it with the harness's own Playwright + Chromium (the browsers are
already in `~/Library/Caches/ms-playwright`).

```sh
# 1. boot the installed profile on a scratch port (same profile, different port)
cd /path/to/deepseek-harness
pnpm dsh web --port 3083                # keep your 3080 server untouched

# 2. probe the GUI with Playwright (this repo ships the scripts)
cd /path/to/your-plugin
node scripts/edex-probe-preview.mjs     # or scripts/edex-probe.mjs
```

The probe is an ESM script kept in `scripts/`. It:

- Resolves Playwright by an absolute path into the harness pnpm store so it
  runs from anywhere:
  `import { chromium } from '<harness>/node_modules/.pnpm/playwright@<version>/node_modules/playwright/index.mjs'`.
- **Collects `console` errors and `pageerror`** — the check that catches real
  crashes; curl cannot see them. A broken bundle reports e.g.
  `client-modules: require("@deepseek-ai/<pkg>/remote") missed the module table`.
- Asserts on the plugin's own stable DOM hooks — `[data-edex-shell]`, the
  `[data-slot="..."]` slot hosts, `data-testid` surfaces — never hashed
  classes.
- **Interacts**: clicks a file entry and asserts the preview pane updates, an
  end-to-end Host Remote round trip through the gateway.
- Saves `probe-shot.png` for a visual check.

Iteration on the scratch port:

```sh
cd /path/to/your-plugin && pnpm build
cd ~/.dsh/profiles/web && pnpm install      # refresh the profile COPY
# then restart the scratch server so the page re-boots with fresh revs
```

Two traps seen in practice:

1. **A missing own-package symlink silently externalizes the `/remote`
   import.** If `node_modules/@deepseek-ai/<your-host-package>` is missing,
   tsdown cannot resolve `<pkg>/remote` and emits `require("<pkg>/remote")`
   instead of inlining the contribution — the build still succeeds and the
   server boots, but the page dies with `missed the module table`. Fix:
   run `scripts/link-harness.sh` (it links your own `packages/*` first, then
   the harness's), rebuild, and confirm with the probe that the bundle has 0
   external `require("@deepseek-ai/...")` calls and the shell renders.
2. **Zombie servers on the scratch port.** Killing the `pnpm` wrapper can
   leave the child `node` holding the port; the next boot dies with
   `listen EADDRINUSE`. See the port-hygiene note in section 5.

---

## 8. Deploying a rebuild to a running GUI (two-instance workflow)

When you already have a server running on port 3080 (your main GUI) and need to
test a rebuild without interrupting it, the workflow is:

1. **Rebuild the plugin source** (the checkout `lib/`):
   ```sh
   cd /path/to/your-plugin && pnpm build
   ```

2. **Clone the current profile into a dedicated scratch profile** so the scratch
   instance has its own copy of the plugin (the main profile stays untouched for
   now):
   ```sh
   cp -R ~/.dsh/profiles/web ~/.dsh/profiles/web-edex
   ```

3. **Refresh the rebuilt bundle into the clone** — `pnpm install` re-copies
   `file:` dependencies from the checkout. Plain `pnpm install` can skip a
   rebuilt `file:` dep ("Already up to date" with a stale copy), so remove the
   installed plugin dirs first to force a fresh copy (see the note in
   section 6):
   ```sh
   cd ~/.dsh/profiles/web-edex
   rm -rf node_modules/@danielng23/dsh-edex-ui \
          node_modules/@danielng23/dsh-client-ui-edex \
          node_modules/@danielng23/dsh-client-ui-theme-terminal \
          node_modules/@danielng23/dsh-host-system-metrics
   pnpm install
   ```

4. **Boot the scratch server** on a dedicated port (http://127.0.0.1:3083):
   ```sh
   cd /path/to/deepseek-harness && pnpm dsh --profile web-edex --port 3083
   ```
   Verify: `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3083/` → `200`.

5. **Probe the scratch GUI** with Playwright to confirm the plugin is active and
   the changes look correct:
   ```sh
   cd /path/to/your-plugin && node scripts/edex-probe-prompt.mjs
   node scripts/edex-probe-font.mjs
   ```
   Assertions: `[data-edex-shell]` present, no console/page errors, font
   properties match the expected app stack.

6. **Remove the plugin from the main profile** (the live 3080 server is
   unaffected — bundles are in memory; only the next restart reflects the
   change):
   ```sh
   cd /path/to/deepseek-harness
   pnpm dsh plugin --profile web remove @danielng23/dsh-edex-ui
   ```

7. **Restart the main 3080 server** (do this after the scratch server is
   verified — the main GUI goes down during the restart):
   ```sh
   cd /path/to/deepseek-harness && pnpm dsh web --port 3080
   ```
   After the restart, the plugin is gone and the stock UI is restored.

> **Why clone the profile?** A new profile name auto-initializes to only
> `@deepseek-ai/dsh-base` (not a web-app profile), so it must be cloned from an
> existing `web` profile. Cloning also preserves the same set of installed
> bundles (other plugins, wallet, etc.) so the scratch instance is a faithful
> copy of the production profile.
>
> **Plugin removal only affects restarts.** The live 3080 process holds its
> bundles in memory, so `pnpm dsh plugin ... remove` is safe to run while the
> server is running. The plugin vanishes on the next boot.
>
> **The scratch profile persists.** Future iteration goes through the standard
> loop (rebuild → `pnpm install` in `web-edex` → restart 3083) without touching
> the main profile again.

---

## 9. Ports configuration (three-instance layout)

The current dev setup runs three web instances, one per plugin source, so a
baseline GUI, the npm-published plugin, and the local checkout are all live at
once:

| Port | Profile | Plugin | Use |
|---|---|---|---|
| 3080 | `web` (instance started before the add) | **none** | baseline GUI without the plugin |
| 3081 | `web` | **npm production** — `@danielng23/dsh-edex-ui@0.1.0` | verify the published package |
| 3083 | `web-edex` | **local** — `file:/path/to/dsh-edex-ui/packages/bundle` | iterate on the checkout |

- **3080** is the plain GUI. A running instance keeps its in-memory config
  until it is restarted, so an instance started before `plugin add` stays
  plugin-free even though the profile now lists the bundle; restarting it
  applies whatever the profile currently composes.
- **3081** is the production install from npm:
  ```sh
  cd /path/to/deepseek-harness
  pnpm dsh plugin --profile web add @danielng23/dsh-edex-ui
  pnpm dsh web --port 3081
  ```
- **3083** is the local install from this checkout. The bundle's `file:`
  dependency specs (`packages/bundle/package.json`) link the local
  sub-packages, so a rebuild of `lib/` is what the scratch instance serves
  after `pnpm install`:
  ```sh
  cd /path/to/deepseek-harness
  pnpm dsh plugin --profile web-edex add file:/path/to/dsh-edex-ui/packages/bundle
  pnpm dsh web --port 3083
  ```

Verify each instance serves its plugin bundles:

```sh
# 200 on 3081 and 3083, 404 on 3080 (no plugin)
curl -s -o /dev/null -w '%{http_code}\n' \
  http://127.0.0.1:3081/plugins/@danielng23/dsh-client-ui-edex/client.js
```

Smoke-test the host RPC (both the published and local installs answer):

```sh
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"type":"client-request","rpcId":"probe","method":"systemMetrics/snapshot","payload":{"args":{}}}' \
  http://127.0.0.1:3081/api/systemMetrics/snapshot   # {"result":{"ok":true,...}}
```

---

## 10. Publish + clean-room check

- `lib/` is the npm payload: **build immediately before publishing** (a stale
  client bundle id or typert `package` field only fails at boot, not at
  `pnpm build`).
- The bundle package's `file:` dependency specs must be flipped to `^` ranges
  before publishing (npm cannot resolve `file:../host`). This repo ships
  `scripts/prepublish.mjs` for the flip; restore afterwards with
  `git checkout packages/bundle/package.json`.
- Publish in dependency order: host → ui → bundle.
- Simulate the real npm experience in a scratch home (no registry access
  needed for the plugin itself, but this exercises the exact consumer path):

  ```sh
  DSH_HOME=/tmp/dsh-release-check pnpm dsh plugin --profile web add <your-bundle-name>
  DSH_HOME=/tmp/dsh-release-check pnpm dsh web --port 3082
  ```

---

## Symptom → cause → fix checklist

| Symptom | Cause | Fix |
|---|---|---|
| `pnpm install` 404 for `@deepseek-ai/...` | peer auto-install fetches broken npm prereleases | `autoInstallPeers: false` in `pnpm-workspace.yaml` |
| tsc: `Cannot find module '@deepseek-ai/...'` | no type source | `scripts/link-harness.sh` (symlink checkout into `node_modules/@deepseek-ai`) |
| tsc TS5097 (`.ts` extension imports) | missing flags | `allowImportingTsExtensions` + `rewriteRelativeImportExtensions` |
| tsc TS6059 (file outside `rootDir`) | `paths` → sibling **source** | point `paths` at built `lib/types/*.d.ts`; build host first |
| rolldown `Missing export` on a subpath | `paths` maps it to a `.d.ts` | devDep `link:` + remove that `paths` entry |
| boot: `pending (waiting for service: remote.<ns>)` | plugin injects a service it must provide itself | drop from `inject`; `ctx.remote.$mount` in `apply` |
| wallet: `cannot get property "remote.<ns>" without inject` | traced read re-dispatch | read once via `ctx.get('remote.<ns>')` and reuse the handle |
| RPC `HTTP 404` for `/api/<ns>/<method>` | typert host face not registered (`package` mismatch) | repoint/regenerate `lib/typert.host.js` so `TYPERT.package` = npm name |
| `loaded without registering "<id>"` | stale profile copy / wrong bundle id | rebuild + `pnpm install` in profile; bundle id must equal the published name |
| profile install "installs" but deps missing | bare path recorded as `link:` | use the `file:` prefix |
| page: `require("@deepseek-ai/<pkg>/remote") missed the module table` | own-package `node_modules` symlink missing → tsdown externalizes the `/remote` import instead of inlining it | `scripts/link-harness.sh` (links your own `packages/*` first), rebuild, refresh the profile copy |
| boot: `listen EADDRINUSE` on the scratch port | zombie `node` from a previous run still holds the port | `lsof -iTCP:<port> -sTCP:LISTEN`, kill the node pid, boot again |
| GUI still old after rebuild | page caches bundles by boot-time `__DSH_BOOT__` revs | restart the server (after refreshing the profile copy) |

## Reference implementation

See [dsh-x402-wallet](https://github.com/ph4310822/dsh-x402-wallet) —
`packages/host`, `packages/ui`, `packages/bundle`, and `scripts/`
(`link-harness.sh`, `repoint-typert.mjs`, `prepublish.mjs`) implement all of
the above, and its README documents the known harness limitations (forwarded
events allowlist, typert generator gap, profile copies, Node engine).

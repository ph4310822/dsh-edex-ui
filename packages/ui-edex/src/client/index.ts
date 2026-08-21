/**
 * eDEX shell plugin, browser half: mounts the `systemMetrics` Host Remote
 * contribution, runs one shared overview poller (left system panel + right
 * network panel), and registers the shell frame into the root `shell.overlay`
 * list slot. The user's Theme Color setting (Settings → General → Theme
 * Color) drives one palette shared by the shell frame (`--edex-*` inline on
 * the shell root) and a token override layer over the original UI
 * (`--dsw-alias-*` on body) — icons included. Purely additive — the default
 * surface stays composed, and the frame only reshapes it visually (restored
 * on unload).
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the api-remotes merge (ctx.remote) into this compilation.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls ui-layout's SlotMap merge (the 'shell.overlay' key).
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the theme plugin's Context merge (ctx.theme) and the
// override-layer vocabulary into this compilation.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
// Type-only: pulls the runtime's Context merge (ctx.workspaces) and the
// workspaces snapshot vocabulary into this compilation.
import type {} from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the settings surface's Context merge (ctx.settingsScope).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// The generated Host Remote contribution; mounted in apply (inlined at build).
import systemMetricsRemote from '@deepseek-ai/dsh-host-system-metrics/remote'
import {
  DEFAULT_THEME_COLOR, EDEX_SETTINGS_NAMESPACE, THEME_COLOR_FIELD,
  normalizeHex, paletteFor, tokenOverridesFor, type EdexSettings,
} from '../settings.ts'
import { EdexShell, type EdexShellInjected } from './frame/EdexShell.tsx'
import { FilesController } from './shared/files.ts'
import { EdexPoller } from './shared/monitor.ts'
import type { ObservableSource, SystemMetricsRemote } from './shared/types.ts'
import { ThemeColorRow, type ThemeColorRowInjected } from './settings/ThemeColorRow.tsx'
import { NS, zh, en } from './settings/locales.ts'

/** Required services: the slot registry, the theme service, the sessions and workspaces runtimes, the locale and settings transport, and the Remote carrier (namespace mounted in apply). */
export const inject = ['slots', 'remote', 'theme', 'sessions', 'workspaces', 'locale', 'connection', 'settingsScope']

/**
 * Client plugin body: mount the systemMetrics contribution, start the shared
 * poller, apply the theme-color override layer, and register the shell frame
 * and the Theme Color settings row.
 * @param ctx - client root context.
 * @returns disposer that unmounts the Remote namespace on unload.
 */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(systemMetricsRemote)
  let disposed = false
  const dispose = async (): Promise<void> => {
    if (disposed) return
    disposed = true
    await disposeRemote()
  }
  // Non-traced read of the mounted namespace (post-mortem 0001 pattern).
  const metrics = ctx.get('remote.systemMetrics') as SystemMetricsRemote

  // The durable Theme Color preference (Settings → General → Theme Color).
  // Bound here so the override layer, the shell hook, and the settings row
  // all observe the same accepted section.
  const scope = ctx.settingsScope.bind<EdexSettings>({ namespace: EDEX_SETTINGS_NAMESPACE })

  /** Current theme color, defaulting until the scope publishes its first section. */
  const themeColorSource: ObservableSource<string> = {
    getSnapshot: () => scope.getSnapshot().value?.themeColor ?? DEFAULT_THEME_COLOR,
    subscribe: (listener) => scope.subscribe(() => listener()),
  }

  // Recolor the original UI from the theme color: a token override layer on
  // top of the active theme (the label tokens feed every icon glyph —
  // `label-tertiary`/`label-caption` are the small icons beside tool names).
  // Re-applied on every accepted scope change; removed when this plugin
  // unloads. The user's theme preference is never touched.
  let disposeOverrides: (() => void) | undefined
  ctx.effect(() => {
    const applyOverrides = (): void => {
      disposeOverrides?.()
      disposeOverrides = ctx.theme.overrideTokens(
        'dsh-client-ui-edex',
        tokenOverridesFor(paletteFor(themeColorSource.getSnapshot())),
      )
    }
    applyOverrides()
    const off = scope.subscribe(applyOverrides)
    return () => { off(); disposeOverrides?.() }
  }, 'ui-edex: theme-color token override')

  const poller = new EdexPoller(metrics)
  ctx.effect(() => {
    poller.start()
    return () => { poller.stop() }
  }, 'ui-edex: overview poller')

  const files = new FilesController(metrics)

  // The DIR panel follows the ACTIVE CONVERSATION's workspace: whenever the
  // current session changes, the filesystem browser navigates to that
  // conversation's workspace folder (navigating away clears any file
  // preview). Sessions with no workspace membership keep the last directory.
  ctx.effect(() => {
    let lastPath: string | undefined
    const sync = (): void => {
      const sessionId = ctx.sessions.list.getSnapshot().current
      const workspace = sessionId === undefined
        ? undefined
        : ctx.workspaces.list.getSnapshot().items.find(w => w.sessionIds.includes(sessionId))
      const path = workspace?.path
      if (path !== undefined && path !== lastPath) {
        lastPath = path
        void files.list(path)
      }
    }
    const offSession = ctx.sessions.list.subscribe(sync)
    const offWorkspaces = ctx.workspaces.list.subscribe(sync)
    sync()
    return () => { offSession(); offWorkspaces() }
  }, 'ui-edex: session-workspace dir navigation')

  ctx.effect(
    () => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'edex-shell',
      order: 1000,
      inject: (): EdexShellInjected => ({
        refreshFiles: () => { void files.refresh() },
        navigateFiles: (name: string) => { files.navigate(name) },
        selectFile: (name: string) => { void files.selectFile(name) },
        hooks: {
          panel: poller.panel,
          network: poller.network,
          files: files.files,
          // Feeds the terminal path prompt at the composer input's left edge.
          workspaces: ctx.workspaces.list,
          sessions: ctx.sessions.list,
          // Feeds the shell frame's --edex-* palette (theme color setting).
          themeColor: themeColorSource,
        },
      }),
    }, EdexShell)),
    'ui-edex: shell overlay registration',
  )

  // The Theme Color preference row joins the General section's item slot at
  // order 12 (after Appearance 10 and the terminal theme 11). The built-in
  // Appearance row's durable section is separate; this row owns the eDEX
  // accent and writes only the ui-edex namespace.
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-edex: settings row dictionaries')

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'edex-theme-color',
    order: 12,
    locale: NS,
    inject: (): ThemeColorRowInjected => ({
      setColor: (color: string) => {
        const normalized = normalizeHex(color)
        if (normalized !== null) void scope.set(THEME_COLOR_FIELD, normalized)
      },
      hooks: { color: themeColorSource },
    }),
  }, ThemeColorRow))

  return dispose
}

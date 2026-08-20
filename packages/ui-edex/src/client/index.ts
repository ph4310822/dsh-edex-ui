/**
 * eDEX shell plugin, browser half: mounts the `systemMetrics` Host Remote
 * contribution, runs one shared overview poller (left system panel + right
 * network panel), and registers the shell frame into the root `shell.overlay`
 * list slot. Purely additive — the default surface stays composed, and the
 * frame only reshapes it visually (restored on unload).
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the api-remotes merge (ctx.remote) into this compilation.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls ui-layout's SlotMap merge (the 'shell.overlay' key).
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the theme plugin's Context merge (ctx.theme) and the
// override-layer vocabulary into this compilation.
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
// The generated Host Remote contribution; mounted in apply (inlined at build).
import systemMetricsRemote from '@deepseek-ai/dsh-host-system-metrics/remote'
import { EdexShell, type EdexShellInjected } from './EdexShell.tsx'
import { FilesController } from './files.ts'
import { EdexPoller } from './monitor.ts'
import type { SystemMetricsRemote } from './types.ts'

/** Required services: the slot registry, the theme service, and the Remote carrier (namespace mounted in apply). */
export const inject = ['slots', 'remote', 'theme']

/**
 * Green-on-black alias-token layer for the ORIGINAL web UI. Applied through
 * the theme service's override stack (never through the preference), so every
 * stock surface — chat, sidebar, settings, details — is recolored terminal
 * green while the user's theme choice stays untouched, and the layer is
 * removed when this plugin unloads. Both palette modes carry the same value:
 * the terminal skin is scheme-invariant.
 */
export const TERMINAL_TOKEN_OVERRIDES: ThemeTokenOverrides = {
  '--dsw-alias-bg-base': { light: '#071d10', dark: '#071d10' },
  '--dsw-alias-bg-layer-1': { light: '#02120a', dark: '#02120a' },
  '--dsw-alias-bg-layer-2': { light: '#031d10', dark: '#031d10' },
  '--dsw-alias-bg-overlay': { light: '#071d10', dark: '#071d10' },
  '--dsw-alias-border-l1': { light: '#1d7a3f', dark: '#1d7a3f' },
  '--dsw-alias-border-l2': { light: '#2ea854', dark: '#2ea854' },
  '--dsw-alias-border-l3': { light: '#35e06a', dark: '#35e06a' },
  '--dsw-alias-brand-primary': { light: '#35e06a', dark: '#35e06a' },
  '--dsw-alias-label-primary': { light: '#35e06a', dark: '#35e06a' },
  '--dsw-alias-label-secondary': { light: '#2ea854', dark: '#2ea854' },
  '--dsw-alias-state-error-primary': { light: '#e05a5a', dark: '#e05a5a' },
  '--dsw-alias-state-success-primary': { light: '#35e06a', dark: '#35e06a' },
  '--dsw-alias-state-warn-primary': { light: '#e0c05a', dark: '#e0c05a' },
  '--dsw-specific-sidebar-fill': { light: '#001408', dark: '#001408' },
  '--dsw-specific-input-major': { light: '#02120a', dark: '#02120a' },
}

/**
 * Client plugin body: mount the systemMetrics contribution, start the shared
 * poller, and register the shell frame into the overlay layer once the layout
 * declares it.
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

  // Recolor the original UI terminal green: a token override layer on top of
  // the active theme, removed when this plugin unloads. The user's theme
  // preference is never touched (the Appearance → Terminal row from
  // ui-theme-terminal offers the persistent full-theme alternative).
  ctx.effect(
    () => ctx.theme.overrideTokens('dsh-client-ui-edex', TERMINAL_TOKEN_OVERRIDES),
    'ui-edex: green-terminal token override',
  )

  const poller = new EdexPoller(metrics)
  ctx.effect(() => {
    poller.start()
    return () => { poller.stop() }
  }, 'ui-edex: overview poller')

  const files = new FilesController(metrics)

  ctx.effect(
    () => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'edex-shell',
      order: 1000,
      inject: (): EdexShellInjected => ({
        refreshFiles: () => { void files.refresh() },
        navigateFiles: (name: string) => { files.navigate(name) },
        hooks: {
          panel: poller.panel,
          network: poller.network,
          files: files.files,
        },
      }),
    }, EdexShell)),
    'ui-edex: shell overlay registration',
  )

  return dispose
}

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
// The generated Host Remote contribution; mounted in apply (inlined at build).
import systemMetricsRemote from '@deepseek-ai/dsh-host-system-metrics/remote'
import { EdexShell, type EdexShellInjected } from './EdexShell.tsx'
import { FilesController } from './files.ts'
import { EdexPoller } from './monitor.ts'
import type { SystemMetricsRemote } from './types.ts'

/** Required services: the slot registry and the Remote carrier (namespace mounted in apply). */
export const inject = ['slots', 'remote']

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

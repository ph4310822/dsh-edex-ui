/**
 * Sidebar brand-row clock plugin, browser half: registers a live clock into
 * the `sidebar.brand` slot at a lower priority than the default wordmark, so
 * it shadows the logo (the slot core renders the lowest-priority occupant).
 * The brand row is rendered by ui-sidebar only in wide mode.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls ui-sidebar's SlotMap merge (the 'sidebar.brand' key).
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { Clock } from './Clock.tsx'

/** Required service: the slot registry. */
export const inject = ['slots']

/**
 * Client plugin body: register the clock into the brand row.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(
    () => ctx.slots.register({
      name: 'sidebar.brand',
      // Shadow the default wordmark: lower priority renders first.
      priority: -1,
    }, Clock),
    'ui-sidebar-clock: brand row registration',
  )
}

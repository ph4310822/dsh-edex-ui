/**
 * CRT bezel plugin, browser half: wraps the whole web UI in decorative
 * left/right/bottom bars via the root `shell.overlay` list slot (AppFrame
 * renders that layer above everything, z-index 20). The bars are
 * click-through (pointer-events: none) so the app stays fully interactive;
 * they color from the active theme's alias tokens, so the bezel matches the
 * terminal theme too.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls ui-layout's SlotMap merge (the 'shell.overlay' key).
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { CrtFrame } from './CrtFrame.tsx'

/** Required service: the slot registry. */
export const inject = ['slots']

/**
 * Client plugin body: register the bezel into the overlay layer.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(
    () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'crt-frame',
      order: 0,
    }, CrtFrame),
    'ui-crt-frame: overlay registration',
  )
}

/** Host loader entry for the eDEX shell plugin. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { EDEX_SETTINGS_NAMESPACE, EdexSettingsSchema } from './settings.ts'

/**
 * Register the durable theme-color section when the settings service is
 * composed. The browser half binds a scope to this namespace, so the user's
 * Theme Color choice persists in the user-settings document.
 * @param ctx - Host context that may acquire the settings service.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(EDEX_SETTINGS_NAMESPACE), EdexSettingsSchema)
  })
}

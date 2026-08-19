/** `theme-terminal` namespace dictionaries (the Appearance row label). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'theme-terminal'

/** The dictionary key set (source of truth for both locales). */
export type ThemeTerminalKey = 'appearance.terminal'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The terminal theme's Appearance row copy. */
    'theme-terminal': ThemeTerminalKey
  }
}

/** Simplified Chinese dictionary. */
export const zh: Record<ThemeTerminalKey, string> = {
  'appearance.terminal': '终端',
}

/** English dictionary. */
export const en: Record<ThemeTerminalKey, string> = {
  'appearance.terminal': 'Terminal',
}

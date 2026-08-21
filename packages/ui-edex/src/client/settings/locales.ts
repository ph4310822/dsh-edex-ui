/** `settings.edex` namespace dictionaries (the Theme Color row's copy). */

/** Dictionary namespace owned by the eDEX shell plugin. */
export const NS = 'settings.edex'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'edex.themeColor': '主题色',
  'edex.custom': '自定义',
  'edex.preset.terminal': '终端绿',
  'edex.preset.amber': '磷光琥珀',
  'edex.preset.cyan': '矩阵青',
  'edex.preset.violet': '等离子紫',
  'edex.preset.blue': '冰蓝',
} satisfies Record<string, string>

/** The settings.edex namespace key union. */
export type EdexThemeKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'edex.themeColor': 'Theme Color',
  'edex.custom': 'Custom',
  'edex.preset.terminal': 'Terminal Green',
  'edex.preset.amber': 'Phosphor Amber',
  'edex.preset.cyan': 'Matrix Cyan',
  'edex.preset.violet': 'Plasma Violet',
  'edex.preset.blue': 'Ice Blue',
} satisfies Record<EdexThemeKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The eDEX Theme Color settings row's copy. */
    'settings.edex': EdexThemeKey
  }
}

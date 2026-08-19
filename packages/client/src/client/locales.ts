/** `terminal` namespace dictionaries (shell chrome copy). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'terminal'

/** The terminal dictionary key set (the source of truth for both locales). */
export type TerminalKey =
  | 'shell.title'
  | 'shell.sessions'
  | 'shell.newSession'
  | 'shell.chat'
  | 'shell.shell'
  | 'shell.monitor'
  | 'shell.monitor.cpu'
  | 'shell.monitor.memory'
  | 'shell.monitor.uptime'
  | 'shell.monitor.unavailable'
  | 'shell.pty.open'
  | 'shell.pty.close'
  | 'shell.pty.failed'
  | 'shell.pty.connecting'
  | 'shell.pty.closed'
  | 'shell.prompt.placeholder'
  | 'shell.prompt.aria'
  | 'shell.boot.byline'
  | 'shell.chat.empty'
  | 'shell.chat.running'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The terminal shell frame, chat, and monitor copy. */
    'terminal': TerminalKey
  }
}

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh: Record<TerminalKey, string> = {
  'shell.title': 'DEEPSEEK HARNESS 终端',
  'shell.sessions': '会话',
  'shell.newSession': '新建会话',
  'shell.chat': '对话',
  'shell.shell': '终端',
  'shell.monitor': '监视',
  'shell.monitor.cpu': 'CPU',
  'shell.monitor.memory': '内存',
  'shell.monitor.uptime': '运行时间',
  'shell.monitor.unavailable': '--',
  'shell.pty.open': '打开终端',
  'shell.pty.close': '关闭终端',
  'shell.pty.failed': '终端连接失败',
  'shell.pty.connecting': '连接中…',
  'shell.pty.closed': '终端已关闭',
  'shell.prompt.placeholder': '输入消息，Enter 发送，Ctrl+C 停止',
  'shell.prompt.aria': '对话输入',
  'shell.boot.byline': 'deepseek-harness — 终端工作台',
  'shell.chat.empty': '等待第一条消息…',
  'shell.chat.running': '运行中',
}

/** English dictionary. */
export const en: Record<TerminalKey, string> = {
  'shell.title': 'DEEPSEEK HARNESS TERMINAL',
  'shell.sessions': 'SESSIONS',
  'shell.newSession': 'New session',
  'shell.chat': 'CHAT',
  'shell.shell': 'SHELL',
  'shell.monitor': 'MONITOR',
  'shell.monitor.cpu': 'CPU',
  'shell.monitor.memory': 'MEM',
  'shell.monitor.uptime': 'UPTIME',
  'shell.monitor.unavailable': '--',
  'shell.pty.open': 'Open terminal',
  'shell.pty.close': 'Close terminal',
  'shell.pty.failed': 'Terminal connection failed',
  'shell.pty.connecting': 'Connecting…',
  'shell.pty.closed': 'Terminal closed',
  'shell.prompt.placeholder': 'Type a message, Enter to send, Ctrl+C to stop',
  'shell.prompt.aria': 'Conversation input',
  'shell.boot.byline': 'deepseek-harness — terminal workspace',
  'shell.chat.empty': 'waiting for the first message…',
  'shell.chat.running': 'running',
}

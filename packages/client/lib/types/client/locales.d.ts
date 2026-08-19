/** `terminal` namespace dictionaries (shell chrome copy). */
/** Dictionary namespace owned by this plugin. */
export declare const NS = "terminal";
/** The terminal dictionary key set (the source of truth for both locales). */
export type TerminalKey = 'shell.title' | 'shell.sessions' | 'shell.newSession' | 'shell.chat' | 'shell.shell' | 'shell.monitor' | 'shell.monitor.cpu' | 'shell.monitor.memory' | 'shell.monitor.uptime' | 'shell.monitor.unavailable' | 'shell.pty.open' | 'shell.pty.close' | 'shell.pty.failed' | 'shell.pty.connecting' | 'shell.pty.closed' | 'shell.prompt.placeholder' | 'shell.prompt.aria' | 'shell.boot.byline' | 'shell.chat.empty' | 'shell.chat.running';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The terminal shell frame, chat, and monitor copy. */
        'terminal': TerminalKey;
    }
}
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: Record<TerminalKey, string>;
/** English dictionary. */
export declare const en: Record<TerminalKey, string>;
//# sourceMappingURL=locales.d.ts.map
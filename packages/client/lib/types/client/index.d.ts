/**
 * Terminal shell plugin, browser half: one register() call contributes
 * TerminalFrame into the runtime's built-in 'root' slot and declares the
 * per-session workspace slot; a second register fills that workspace. The
 * plugin also registers its own conversation Definitions + Chat builder (the
 * default ui-conversation is not composed in the terminal profile) and owns
 * the frame-level monitor poller.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        /**
         * The per-session terminal workspace (chat log, prompt, and shell panel).
         * Session-maybe: the occupant owns the no-session hint without changing
         * its React identity across a session switch.
         */
        'terminal.workspace': {
            kind: 'single';
            scope: 'session-maybe';
            owner: {};
        };
    }
}
/** Required services: slot registry, session/workspace verbs, and the two mounted Remotes. */
export declare const inject: string[];
/**
 * Client plugin body: register the terminal shell frame and workspace, mount
 * the chat assembly, and start the monitor poller.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map
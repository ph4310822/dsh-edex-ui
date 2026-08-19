import { IDLE_PTY_STATUS } from "./contract.js";
import { createTerminalFrameStore, createTerminalSessionStore } from "./stores.js";
import { registerTerminalConversationNodes } from "./conversation-nodes.js";
import { MonitorPoller } from "./monitor-poller.js";
import { PtyClient } from "./pty-client.js";
import { en, NS, zh } from "./locales.js";
import { TerminalFrame } from "./frame/TerminalFrame.js";
import { TerminalWorkspace, } from "./workspace/TerminalWorkspace.js";
/** Required services: slot registry, session/workspace verbs, and the two mounted Remotes. */
export const inject = [
    'slots', 'sessions', 'workspaces', 'locale',
    'conversationEvents', 'conversationViews', 'remote',
    'remote.systemMetrics', 'remote.terminalUI',
];
/** Static no-session sources for the workspace hooks compartment. */
const ABSENT_PTY_STATUS = {
    getSnapshot: () => IDLE_PTY_STATUS,
    subscribe: () => () => { },
};
/** The no-session workspace face (session-maybe inject with no current session). */
function absentWorkspaceFace() {
    return {
        send: () => { },
        cancel: () => { },
        pty: { open: () => { }, write: () => { }, close: () => { }, onOutput: null },
        hooks: { ptyStatus: ABSENT_PTY_STATUS },
    };
}
/**
 * Client plugin body: register the terminal shell frame and workspace, mount
 * the chat assembly, and start the monitor poller.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-terminal: dictionaries');
    registerTerminalConversationNodes(ctx);
    const monitor = new MonitorPoller(ctx.remote.systemMetrics);
    ctx.effect(() => {
        monitor.start();
        return () => { monitor.stop(); };
    }, 'ui-terminal: monitor poller');
    ctx.slots.register({
        name: 'root',
        children: {
            'terminal.workspace': { kind: 'single', scope: 'session-maybe' },
        },
        store: createTerminalFrameStore,
        locale: NS,
        inject: (actions) => ({
            openSession: (id) => { ctx.sessions.open(id); },
            newSession: () => { ctx.workspaces.startSession(); },
            hooks: { monitor: monitor.observationSource },
        }),
    }, TerminalFrame);
    ctx.slots.register({
        name: 'terminal.workspace',
        store: createTerminalSessionStore,
        locale: NS,
        inject: (sessionId, _actions) => {
            if (sessionId === undefined)
                return absentWorkspaceFace();
            const session = ctx.sessions.binding(sessionId)?.session;
            if (session === undefined) {
                throw new Error(`ui-terminal: session "${sessionId}" is unavailable`);
            }
            const pty = new PtyClient(sessionId, ctx.remote.terminalUI);
            return {
                send: (text) => {
                    void session.prompt([{ type: 'text', text }], 'queue');
                },
                cancel: () => {
                    void session.cancel();
                },
                pty,
                hooks: { ptyStatus: pty.statusSource },
            };
        },
    }, TerminalWorkspace);
}
//# sourceMappingURL=index.js.map
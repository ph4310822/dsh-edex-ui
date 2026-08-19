import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Per-session terminal workspace: the chat log, the prompt line, and the
 * embedded PTY panel, switching on the frame's active-panel owner props.
 */
import { useEffect, useMemo } from 'react';
import { renderChatLines } from "../chat-lines.js";
import { TerminalChat } from "./chat/TerminalChat.js";
import { TerminalPrompt } from "./prompt/TerminalPrompt.js";
import { TerminalPanel } from "./pty/TerminalPanel.js";
import css from './TerminalWorkspace.module.css';
/** No-session hint rendered by the session-maybe workspace. */
function NoSession({ t }) {
    return (_jsxs("div", { className: css.noSession, "data-testid": "terminal-no-session", children: [_jsx("div", { className: css.noSessionText, children: "$ select a session or create one" }), _jsxs("div", { className: css.noSessionHint, children: [t('shell.newSession'), " \u2192"] })] }));
}
/** The per-session workspace. */
export function TerminalWorkspace({ sessionId, useSession, useSessions, useStore, actions, t, panel, onSetPanel, send, cancel, pty, usePtyStatus, }) {
    const snapshot = sessionId === undefined ? undefined : useSession(s => s);
    const cwd = useSessions(s => sessionId === undefined ? undefined : s.byId[sessionId]?.cwd);
    const status = usePtyStatus();
    const store = useStore();
    // Close the session's PTY when the workspace unmounts (session switch or
    // plugin unload); the panel additionally closes it when hidden.
    useEffect(() => {
        return () => { pty.close(); };
    }, [pty]);
    const lines = useMemo(() => {
        if (snapshot === undefined)
            return [];
        const nodes = snapshot.chat.order
            .map(key => snapshot.chat.nodes.get(key))
            .filter((node) => node !== undefined);
        return renderChatLines({ nodes, pending: snapshot.pending });
    }, [snapshot]);
    if (sessionId === undefined || snapshot === undefined || snapshot.openState !== 'open') {
        return _jsx(NoSession, { t: t });
    }
    return (_jsxs("div", { className: css.workspace, "data-testid": "terminal-workspace", children: [panel === 'chat'
                ? (_jsxs(_Fragment, { children: [_jsx(TerminalChat, { lines: lines, running: snapshot.running, t: t }), _jsx(TerminalPrompt, { draft: store.draft, onDraft: (text) => { actions.setDraft(text); }, onSubmit: () => {
                                const text = store.draft.trim();
                                if (text === '')
                                    return;
                                actions.submitDraft();
                                send(text);
                            }, onHistoryUp: () => { actions.historyUp(); }, onHistoryDown: () => { actions.historyDown(); }, onCancel: cancel, busy: snapshot.running, t: t })] }))
                : _jsx(TerminalPanel, { pty: pty, cwd: cwd, status: status, t: t }), _jsxs("div", { className: css.tabStrip, children: [_jsx("button", { type: "button", className: css.tab, "data-active": panel === 'chat' ? '' : undefined, onClick: () => { onSetPanel('chat'); }, children: t('shell.chat') }), _jsx("button", { type: "button", className: css.tab, "data-active": panel === 'pty' ? '' : undefined, onClick: () => { onSetPanel('pty'); }, children: t('shell.shell') })] })] }));
}
//# sourceMappingURL=TerminalWorkspace.js.map
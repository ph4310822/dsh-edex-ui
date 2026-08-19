import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Terminal shell root frame: boot sequence, top status bar, session rail,
 * the per-session workspace slot, and the monitor bar. Pure component —
 * everything arrives through the framework shares and the inject face.
 */
import { useEffect, useState } from 'react';
import { BootSequence } from "./BootSequence.js";
import { SystemMonitorBar } from "./SystemMonitorBar.js";
import css from './TerminalFrame.module.css';
/** Boot overlay dwell time before the frame settles in. */
export const BOOT_DWELL_MS = 1600;
/** Render one status-bar segment value (clock). */
function clockNow() {
    return new Date().toLocaleTimeString();
}
/** The root occupant: full-screen CRT frame around the per-session workspace. */
export function TerminalFrame({ renderSlot, useStore, actions, useSessions, useMonitor, t, openSession, newSession, }) {
    const frame = useStore();
    const sessions = useSessions();
    const monitor = useMonitor();
    const [clock, setClock] = useState(clockNow);
    const [booted, setBooted] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setBooted(true), BOOT_DWELL_MS);
        return () => { clearTimeout(timer); };
    }, []);
    useEffect(() => {
        const timer = setInterval(() => { setClock(clockNow); }, 1000);
        return () => { clearInterval(timer); };
    }, []);
    return (_jsxs("div", { className: css.shell, "data-terminal-shell": "", children: [!booted && _jsx(BootSequence, { t: t }), _jsxs("header", { className: css.topBar, children: [_jsx("span", { className: css.product, children: t('shell.title') }), _jsx("span", { className: css.spacer }), _jsx("button", { type: "button", className: css.tabButton, "data-active": frame.panel === 'chat' ? '' : undefined, onClick: () => actions.setPanel('chat'), children: t('shell.chat') }), _jsx("button", { type: "button", className: css.tabButton, "data-active": frame.panel === 'pty' ? '' : undefined, onClick: () => actions.setPanel('pty'), children: t('shell.shell') }), _jsx("span", { className: css.spacer }), _jsx("span", { className: css.clock, children: clock })] }), _jsxs("div", { className: css.body, children: [_jsxs("nav", { className: css.rail, "aria-label": t('shell.sessions'), children: [_jsxs("div", { className: css.railHeader, children: [_jsx("span", { children: t('shell.sessions') }), _jsx("button", { type: "button", className: css.railNew, onClick: newSession, "aria-label": t('shell.newSession'), children: "+" })] }), _jsx("ul", { className: css.railList, children: sessions.ids.map((id) => {
                                    const summary = sessions.byId[id];
                                    return (_jsx("li", { children: _jsxs("button", { type: "button", className: css.railItem, "data-active": sessions.current === id ? '' : undefined, onClick: () => { openSession(id); }, children: [_jsx("span", { className: css.railTitle, children: summary?.displayTitle ?? id }), summary?.running === true && _jsx("span", { className: css.railStatus, children: "\u25B6" })] }) }, id));
                                }) })] }), _jsx("main", { className: css.workspace, children: renderSlot('terminal.workspace', {}) })] }), frame.monitorVisible && _jsx(SystemMonitorBar, { observation: monitor, t: t }), _jsx("footer", { className: css.bottomBar, children: _jsxs("button", { type: "button", className: css.monitorToggle, onClick: () => { actions.toggleMonitor(); }, children: [t('shell.monitor'), " ", frame.monitorVisible ? '◉' : '○'] }) })] }));
}
//# sourceMappingURL=TerminalFrame.js.map
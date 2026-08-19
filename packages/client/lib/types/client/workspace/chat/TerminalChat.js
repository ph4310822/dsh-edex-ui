import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Terminal-style chat log: renders ordered log lines, auto-scrolls to the
 * newest line while the reader is at the bottom, and shows the running
 * indicator. Pure component over pre-projected lines.
 */
import { useEffect, useRef } from 'react';
import css from './TerminalChat.module.css';
/** One log line row. */
function LineRow({ line }) {
    return (_jsxs("div", { className: css[line.kind], "data-testid": "terminal-line", children: [line.kind === 'prompt' && _jsx("span", { className: css.promptMark, children: "user@harness:~$ " }), _jsx("span", { className: css.text, children: line.text }), line.detail !== undefined && _jsx("span", { className: css.detail, children: line.detail })] }));
}
/** The auto-scrolling chat log. */
export function TerminalChat({ lines, running, t }) {
    const scrollport = useRef(null);
    useEffect(() => {
        const element = scrollport.current;
        if (element === null)
            return;
        const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
        if (atBottom)
            element.scrollTop = element.scrollHeight;
    }, [lines]);
    return (_jsxs("div", { className: css.chat, "data-testid": "terminal-chat", children: [_jsxs("div", { className: css.scrollport, ref: scrollport, children: [lines.length === 0 && (_jsx("div", { className: css.empty, "data-testid": "terminal-chat-empty", children: t('shell.chat.empty') })), lines.map(line => _jsx(LineRow, { line: line }, line.key))] }), running && _jsxs("div", { className: css.running, "data-testid": "terminal-running", children: ["\u25AE ", t('shell.chat.running')] })] }));
}
//# sourceMappingURL=TerminalChat.js.map
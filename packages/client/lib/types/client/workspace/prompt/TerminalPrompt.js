import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import css from './TerminalPrompt.module.css';
/** Handle one prompt-line key. */
export function handlePromptKey(event, props) {
    if (event.key === 'Enter') {
        if (props.busy)
            return;
        event.preventDefault();
        props.onSubmit();
        return;
    }
    if (event.key === 'c' && event.ctrlKey) {
        event.preventDefault();
        props.onCancel();
        return;
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        props.onHistoryUp();
        return;
    }
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        props.onHistoryDown();
    }
}
/** The `$` prompt line. */
export function TerminalPrompt({ draft, onDraft, onSubmit, onHistoryUp, onHistoryDown, onCancel, busy, t }) {
    return (_jsxs("div", { className: css.prompt, "data-testid": "terminal-prompt", children: [_jsx("span", { className: css.mark, "aria-hidden": "true", children: "$" }), _jsx("input", { className: css.input, type: "text", value: draft, placeholder: t('shell.prompt.placeholder'), "aria-label": t('shell.prompt.aria'), onChange: (event) => { onDraft(event.target.value); }, onKeyDown: (event) => {
                    handlePromptKey(event, { onSubmit, onHistoryUp, onHistoryDown, onCancel, busy });
                }, autoFocus: true, spellCheck: false })] }));
}
//# sourceMappingURL=TerminalPrompt.js.map
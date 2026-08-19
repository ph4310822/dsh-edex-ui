import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import css from './BootSequence.module.css';
/** The full-screen boot overlay. */
export function BootSequence({ t }) {
    return (_jsx("div", { className: css.overlay, role: "status", "aria-live": "polite", children: _jsxs("div", { className: css.crt, children: [_jsx("pre", { className: css.logo, children: '╔══════════════════════════════════════╗\n'
                        + '║  D E E P S E E K   H A R N E S S    ║\n'
                        + '╚══════════════════════════════════════╝' }), _jsx("div", { className: css.byline, children: t('shell.boot.byline') }), _jsx("div", { className: css.cursor, "aria-hidden": "true", children: "\u258C" })] }) }));
}
//# sourceMappingURL=BootSequence.js.map
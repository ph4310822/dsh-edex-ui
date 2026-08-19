import { Terminal } from '@xterm/xterm';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { TerminalReadResult } from '@deepseek-ai/dsh-host-terminal-bridge/types';
import type { PtyStatus } from '../../contract.ts';
/** The PTY verbs the panel drives (a narrowed PtyClient face for testability). */
export interface TerminalPanelPty {
    open: (cwd?: string) => void;
    write: (text: string) => void;
    close: () => void;
    /** Output-delta sink the panel assigns on mount and clears on unmount. */
    onOutput: ((read: TerminalReadResult) => void) | null;
}
/** Terminal panel props. */
export interface TerminalPanelProps {
    pty: TerminalPanelPty;
    /** Session workspace path passed to the PTY open. */
    cwd: string | undefined;
    /** Live PTY status from the usePtyStatus hook. */
    status: PtyStatus;
    t: TranslateNS<'terminal'>;
}
/** Phosphor-green xterm theme matching the CRT palette. */
export declare const TERMINAL_THEME: {
    readonly background: "#000a00";
    readonly foreground: "#35e06a";
    readonly cursor: "#35e06a";
    readonly cursorAccent: "#000a00";
    readonly selectionBackground: "#14401f";
    readonly black: "#000a00";
    readonly red: "#e05a5a";
    readonly green: "#35e06a";
    readonly yellow: "#e0c05a";
    readonly blue: "#5ab0e0";
    readonly magenta: "#c05ae0";
    readonly cyan: "#5ae0c0";
    readonly white: "#c8e0d0";
    readonly brightBlack: "#40704f";
    readonly brightRed: "#ff7a7a";
    readonly brightGreen: "#7affa0";
    readonly brightYellow: "#ffe07a";
    readonly brightBlue: "#7ac8ff";
    readonly brightMagenta: "#e07aff";
    readonly brightCyan: "#7afff0";
    readonly brightWhite: "#f0fff4";
};
/** Build one xterm instance (separated for test seams). */
export declare function createTerminal(): Terminal;
/** The embedded PTY panel. */
export declare function TerminalPanel({ pty, cwd, status, t }: TerminalPanelProps): import("react").JSX.Element;
//# sourceMappingURL=TerminalPanel.d.ts.map
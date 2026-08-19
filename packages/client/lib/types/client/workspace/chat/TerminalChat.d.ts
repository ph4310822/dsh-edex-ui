import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { TerminalLine } from '../../contract.ts';
/** Chat log props. */
export interface TerminalChatProps {
    /** Pre-projected log lines in render order. */
    lines: readonly TerminalLine[];
    /** Whether the session currently runs a turn. */
    running: boolean;
    t: TranslateNS<'terminal'>;
}
/** The auto-scrolling chat log. */
export declare function TerminalChat({ lines, running, t }: TerminalChatProps): import("react").JSX.Element;
//# sourceMappingURL=TerminalChat.d.ts.map
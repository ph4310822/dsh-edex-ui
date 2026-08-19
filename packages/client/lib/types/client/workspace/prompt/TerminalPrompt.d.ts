/**
 * Terminal prompt line: a `$`-prefixed inline input with Enter-to-send,
 * Ctrl+C to cancel, and Up/Down history navigation. Controlled component.
 */
import type { KeyboardEvent } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
/** Prompt line props. */
export interface TerminalPromptProps {
    /** Current draft text (owned by the session store). */
    draft: string;
    onDraft: (text: string) => void;
    /** Submit the current draft. */
    onSubmit: () => void;
    onHistoryUp: () => void;
    onHistoryDown: () => void;
    /** Cancel the running turn (Ctrl+C). */
    onCancel: () => void;
    /** Whether a turn is running (disables submit while busy). */
    busy: boolean;
    t: TranslateNS<'terminal'>;
}
/** Handle one prompt-line key. */
export declare function handlePromptKey(event: KeyboardEvent<HTMLInputElement>, props: Pick<TerminalPromptProps, 'onSubmit' | 'onHistoryUp' | 'onHistoryDown' | 'onCancel' | 'busy'>): void;
/** The `$` prompt line. */
export declare function TerminalPrompt({ draft, onDraft, onSubmit, onHistoryUp, onHistoryDown, onCancel, busy, t }: TerminalPromptProps): import("react").JSX.Element;
//# sourceMappingURL=TerminalPrompt.d.ts.map
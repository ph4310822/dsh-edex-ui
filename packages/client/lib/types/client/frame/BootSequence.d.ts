/**
 * One-shot CRT boot overlay: a short typed-byline sequence shown while the
 * frame settles. Pure component; the dwell timer lives in TerminalFrame.
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
/** Boot overlay props. */
export interface BootSequenceProps {
    t: TranslateNS<'terminal'>;
}
/** The full-screen boot overlay. */
export declare function BootSequence({ t }: BootSequenceProps): import("react").JSX.Element;
//# sourceMappingURL=BootSequence.d.ts.map
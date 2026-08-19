import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { ObservableSource } from '../pty-client.ts';
import type { PtyStatus } from '../contract.ts';
import type { createTerminalSessionStore } from '../stores.ts';
import { type TerminalPanelPty } from './pty/TerminalPanel.tsx';
/** Frame-owned panel switch passed as owner props to the workspace slot. */
export interface TerminalWorkspaceOwnerProps {
    panel: 'chat' | 'pty';
    onSetPanel: (panel: 'chat' | 'pty') => void;
}
/** The workspace entry's inject face: session verbs plus the PTY controller. */
export interface TerminalWorkspaceInjected {
    /** Send one prompt into the session (fire-and-forget; failures land in snapshot.promptError). */
    send: (text: string) => void;
    /** Cancel the running turn. */
    cancel: () => void;
    /** Embedded-PTY controller backed by the per-session client. */
    pty: TerminalPanelPty;
    /** Bare observable PTY status bound to the `usePtyStatus` hook by the renderer. */
    hooks: {
        ptyStatus: ObservableSource<PtyStatus>;
    };
}
/** Full composed props of the workspace entry. */
export type TerminalWorkspaceProps = PropsRuntime<'terminal.workspace'> & PropsStore<ReturnType<typeof createTerminalSessionStore>> & PropsLocale<'terminal'> & TerminalWorkspaceOwnerProps & TerminalWorkspaceInjected;
/** The per-session workspace. */
export declare function TerminalWorkspace({ sessionId, useSession, useSessions, useStore, actions, t, panel, onSetPanel, send, cancel, pty, usePtyStatus, }: TerminalWorkspaceProps): import("react").JSX.Element;
//# sourceMappingURL=TerminalWorkspace.d.ts.map
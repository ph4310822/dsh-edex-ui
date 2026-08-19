import type { PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client';
import type { ObservableSource } from '../pty-client.ts';
import type { MonitorObservation } from '../monitor-poller.ts';
import type { createTerminalFrameStore } from '../stores.ts';
import type { TerminalKey } from '../locales.ts';
/** Boot overlay dwell time before the frame settles in. */
export declare const BOOT_DWELL_MS = 1600;
/** The root entry's inject face: session navigation plus the monitor hook seat. */
export interface TerminalFrameInjected {
    /** Select a session as current. */
    openSession: (id: SessionId) => void;
    /** Run the New Session flow (explicit, current, or recent workspace). */
    newSession: () => void;
    /** Bare observable monitor source bound to the `useMonitor` hook by the renderer. */
    hooks: {
        monitor: ObservableSource<MonitorObservation>;
    };
}
/** Localized shell string keys. */
export type ShellKey = TerminalKey;
/** Full composed props: runtime share + child-slot render share + store share + locale + inject face. */
export type TerminalFrameProps = PropsRuntime<'root'> & PropsRenderSlots<'terminal.workspace'> & PropsStore<ReturnType<typeof createTerminalFrameStore>> & PropsLocale<'terminal'> & TerminalFrameInjected;
/** The root occupant: full-screen CRT frame around the per-session workspace. */
export declare function TerminalFrame({ renderSlot, useStore, actions, useSessions, useMonitor, t, openSession, newSession, }: TerminalFrameProps): import("react").JSX.Element;
//# sourceMappingURL=TerminalFrame.d.ts.map
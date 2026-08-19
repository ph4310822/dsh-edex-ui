# @deepseek-ai/dsh-client-ui-terminal

English | [中文](README.zh.md)

Full-screen CRT terminal shell over the web client. This plugin occupies the built-in `root` slot (the default three-column `ui-layout` frame is disabled in the [terminal-shell overlay](../../../examples/terminal-shell/README.md)), and renders a retro terminal workspace: a terminal-style chat log with a `$` prompt, an embedded xterm.js PTY panel, a session rail, and a live system-monitor bar.

## Composition

The shell activates only through the opt-in [terminal-shell example overlay](../../../examples/terminal-shell/cordis.yml), which disables the default surface rows and inserts this plugin plus its two Host Remotes (`@deepseek-ai/dsh-host-system-metrics`, `@deepseek-ai/dsh-host-terminal-bridge`). Because `ui-conversation` is not composed, this plugin registers its own conversation Definitions (user/context, assistant streaming, tool lifecycle, turn failure, compaction checkpoint, unknown fallback) and a Chat target builder — the terminal chat renders from the same `ConversationSnapshot` the default Chat view uses, projected into log lines by the pure `renderChatLines`.

## Browser half

- `apply` registers `TerminalFrame` into `'root'` (declaring the session-maybe `terminal.workspace` child slot) and `TerminalWorkspace` into that slot, seeds the frame and per-session prompt stores, and starts the frame-level monitor poller.
- Chat sending goes through the runtime object layer (`session.prompt`/`cancel` RPC passthroughs); failures surface in `snapshot.promptError`.
- The embedded PTY runs through `ctx.remote.terminalUI` (`open`/`write`/`read`/`signal`/`close`); output streams through a 200 ms poll loop owned by the per-session `PtyClient`, generation-fenced so a superseded open or close can never reconnect a stale terminal.
- The monitor bar reads `ctx.remote.systemMetrics.snapshot` on a 2 s poll owned by `MonitorPoller`; failures degrade to dashes, never throw.
- Locale: zh/en dictionaries under the `terminal` namespace.

## Extension points

- Slot `terminal.workspace` (session-maybe): the per-session workspace surface; registering here replaces the whole chat+shell workspace, mirroring the `conversation` slot posture of the default layout.

## Model Experience

None, as the terminal shell renders browser viewing state; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **PTY geometry is fixed at spawn** — the terminal seam has no resize support, so the panel opens the backend's configured or per-spawn rows/cols and never tracks the container.
- **Output delivery is polling-based** — the 200 ms poll loop adds latency versus a push channel, and switching the panel away closes the PTY (no background shells in v1).
- **Chat renders plain text** — no markdown/rich rendering; assistant output shows as a monospace log.
- **Dark-only** — the shell owns its CRT palette and does not follow the app-wide theme preference.
- **PTY reopen on reconnect** — a connection reset closes and reopens the panel's terminal to avoid read-cursor drift.
- **The legacy conversation slice is a projection** — `snapshot.nodes`/`turnTimings` are derived for type compliance; only the Chat target is authoritative here (unmigrated view consumers are not composed in this profile).

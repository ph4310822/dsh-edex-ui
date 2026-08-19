# @deepseek-ai/dsh-host-terminal-bridge

English | [中文](README.zh.md)

Host Remote bridging interactive browser terminals to the persistent-PTY seam (`ctx.terminals`, `@deepseek-ai/dsh-terminal`): open, raw write, incremental read, signal, and close under the session's agent. It is the browser half's counterpart to the model-facing terminal tools — the user drives the PTY directly instead of the model.

## Usage

Compose the service row beside the Web stack:

```yaml
- id: terminal-bridge
  name: '@deepseek-ai/dsh-host-terminal-bridge'
```

The service key is `ctx.terminalUI`; the wire namespace is `terminalUI`. The generated client projection ships as `./remote` and is mounted in the standard `@deepseek-ai/dsh-api-remotes` Client assembly.

## Operations

| Remote | Behavior |
|---|---|
| `open({ cwd?, rows?, cols? })` | `ctx.terminals.spawn(agent, { type: 'bash', name: 'ui-terminal', ... })` and seeds a per-terminal read cursor so the first poll returns only output after the MOTD |
| `write({ id, text })` | raw bytes through `ctx.terminals.write` — no exclusive send operation, no readiness wait (the terminal seam's raw-write primitive) |
| `read({ id })` | incremental output delta since the previous read by retained-line-count cursor; a scrollback reset returns the whole retained buffer with `truncated: true` so the client redraws; `exited` reports the session gone |
| `signal({ id, signal })` | allowed POSIX signal to the verified foreground process group |
| `close({ id, reason })` | `ctx.terminals.kill` and drops the read cursor |

The agent is resolved from the wire session identity by the standard Typert `agent` lookup, so every operation inherits the terminal seam's exact-Agent ownership enforcement; a bridge cursor never outlives its session on the host.

## Model Experience

None, as this bridge forwards browser keystrokes to the PTY seam; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Read-cursor state is host-local and per-terminal** — a browser reconnect loses the cursor and the client reopens the PTY (documented in the client plugin's limitations).
- **No resize** — the terminal seam has no resize operation; `open` accepts initial geometry only.
- **User-driven shell access** — the bridge serves the session's agent as owner without an approval gate: the browser user is the operator, and the web GUI binds loopback by default (same posture as the model's own terminal tools).

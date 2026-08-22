# @danielng23/dsh-edex-ui

**DeepSeek Harness eDEX-UI shell plugin** — a terminal-inspired overlay for the
DSH web GUI. Adds a classic eDEX-UI layout: system telemetry left bar, world-map
right bar, filesystem browser, and a terminal-styled composer input — all wrapped
around the original UI.

![dsh-edex-ui screenshot](screenshot.png)

## Features

- **Left bar** — system overview panel: CPU, memory, swap, processes, platform
  info, and thermal/power state, with per-core CPU sparklines
- **Right bar** — network status + encom-globe world view with endpoint markers
  and spline links, plus a dual up/down traffic chart with grid
- **Bottom-left** — filesystem browser: directory listing, file preview, storage
  bar, with folder/file SVG icons in the theme green
- **Bottom-right** — file preview pane (text, code, images)
- **Terminal-styled composer** — flattened input capsule, green block caret, and
  a `~/<workspace>` path prompt at the left edge of the input area
- **Workspace-follow** — the dir panel and prompt track the active conversation's
  workspace; switching sessions navigates both the filesystem browser and the
  prompt
- **Green-on-black skin** — token overrides recolour the entire original UI to
  terminal green, without touching the user's theme preference

## Installation

From the harness checkout:

```sh
pnpm dsh plugin --profile web add @danielng23/dsh-edex-ui
```

## Packages

| Package | Host/Client | Description |
|---|---|---|
| `@danielng23/dsh-edex-ui` | — | Installable bundle (`cordis.patch.yml`) |
| `@danielng23/dsh-client-ui-edex` | client | The eDEX shell frame and all panels |
| `@danielng23/dsh-client-ui-theme-terminal` | client | Appearance → Terminal theme row |
| `@danielng23/dsh-host-system-metrics` | host | System telemetry RPC endpoints |

## License

MIT

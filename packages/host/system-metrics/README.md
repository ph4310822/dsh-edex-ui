# @deepseek-ai/dsh-host-system-metrics

English | [中文](README.zh.md)

Host Remote serving point-in-time host resource snapshots to the browser: load averages, average CPU busy ratio since boot, memory totals, and uptime, projected directly from `node:os` at call time (no cache to synchronize).

## Usage

Compose the service row beside the Web stack:

```yaml
- id: system-metrics
  name: '@deepseek-ai/dsh-host-system-metrics'
```

The service key is `ctx.systemMetrics`; the wire namespace is `systemMetrics` with one method `snapshot`. The generated client projection ships as `./remote` and is mounted in the standard `@deepseek-ai/dsh-api-remotes` Client assembly alongside the other Host Remote contributions.

## Semantics

- `snapshot()` returns `SystemMetricsSnapshot`: 1/5/15-minute `loadavg`, `cpuBusyRatio` (busy time ÷ total time across all logical cores since boot, 0..1 — an average since boot, not an instantaneous sample), total/free memory bytes, `uptimeSeconds`, and a wall-clock `timestamp`.
- Every call reads `node:os` directly, so a composition without this plugin answers the domain with an actionable `internal` error naming the missing plugin.

## Model Experience

None, as this package serves `node:os` resource snapshots to the browser; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **CPU ratio is a since-boot average** — no sampling window exists to report instantaneous utilization; a poller-driven delta would need a host-side cursor.
- **No process-level metrics** — the snapshot carries load/memory/uptime only.

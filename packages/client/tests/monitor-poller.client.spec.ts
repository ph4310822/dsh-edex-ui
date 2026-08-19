/** MonitorPoller specs: interval-driven snapshots with a fake systemMetrics Remote. */

import { describe, expect, it, vi } from 'vitest'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { SystemMetricsSnapshot } from '@deepseek-ai/dsh-host-system-metrics/types'
import type { SystemMetricsRemote } from '../src/client/contract.ts'
import { MONITOR_POLL_INTERVAL_MS, MonitorPoller } from '../src/client/monitor-poller.ts'

const SNAPSHOT: SystemMetricsSnapshot = {
  loadavg: [0.5, 0.4, 0.3],
  cpuBusyRatio: 0.25,
  totalMemoryBytes: 1024,
  freeMemoryBytes: 512,
  uptimeSeconds: 60,
  timestamp: 1,
}

/** Fake systemMetrics Remote. */
class FakeMetricsRemote implements SystemMetricsRemote {
  results: RemoteResult<SystemMetricsSnapshot>[] = [
    { ok: true, value: SNAPSHOT },
  ]
  readonly calls: string[] = []

  async snapshot(): Promise<RemoteResult<SystemMetricsSnapshot>> {
    this.calls.push('snapshot')
    return this.results.shift() ?? { ok: true, value: SNAPSHOT }
  }
}

function tickPoll(): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, MONITOR_POLL_INTERVAL_MS + 10) })
}

describe('MonitorPoller', () => {
  it('starts with no observation until the first poll', () => {
    const poller = new MonitorPoller(new FakeMetricsRemote())
    expect(poller.observationSource.getSnapshot()).toEqual({ ok: false })
  })

  it('start fetches immediately and then on the interval', async () => {
    vi.useFakeTimers()
    try {
      const remote = new FakeMetricsRemote()
      const poller = new MonitorPoller(remote)
      poller.start()
      await vi.advanceTimersByTimeAsync(0)
      expect(poller.observationSource.getSnapshot()).toEqual({ ok: true, snapshot: SNAPSHOT })
      expect(remote.calls.filter(call => call === 'snapshot')).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(MONITOR_POLL_INTERVAL_MS)
      expect(remote.calls.filter(call => call === 'snapshot')).toHaveLength(2)
      poller.stop()
    } finally {
      vi.useRealTimers()
    }
  })

  it('publishes ok:false on Remote failure', async () => {
    const remote = new FakeMetricsRemote()
    remote.results = [{ ok: false, error: { code: 'internal', message: 'down', details: {} } }]
    const poller = new MonitorPoller(remote)
    poller.start()
    await new Promise((resolve) => { setTimeout(resolve, 10) })
    expect(poller.observationSource.getSnapshot()).toEqual({ ok: false })
    poller.stop()
  })

  it('stop halts the interval but keeps the last observation readable', async () => {
    vi.useFakeTimers()
    try {
      const remote = new FakeMetricsRemote()
      const poller = new MonitorPoller(remote)
      poller.start()
      await vi.advanceTimersByTimeAsync(0)
      poller.stop()
      const before = remote.calls.filter(call => call === 'snapshot').length
      await vi.advanceTimersByTimeAsync(MONITOR_POLL_INTERVAL_MS * 3)
      expect(remote.calls.filter(call => call === 'snapshot')).toHaveLength(before)
      expect(poller.observationSource.getSnapshot()).toEqual({ ok: true, snapshot: SNAPSHOT })
    } finally {
      vi.useRealTimers()
    }
  })

  it('start is idempotent', async () => {
    vi.useFakeTimers()
    try {
      const remote = new FakeMetricsRemote()
      const poller = new MonitorPoller(remote)
      poller.start()
      poller.start()
      await vi.advanceTimersByTimeAsync(0)
      expect(remote.calls.filter(call => call === 'snapshot')).toHaveLength(1)
      poller.stop()
    } finally {
      vi.useRealTimers()
    }
  })
})

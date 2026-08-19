/** SystemMetricsService specs: node:os projection and Remote binding. */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SystemMetricsService from '../src/index.ts'

/** Mock node:os with deterministic values. */
vi.mock('node:os', () => ({
  cpus: () => [
    { times: { user: 100, nice: 0, sys: 20, idle: 200, irq: 5, iowait: 0 } },
    { times: { user: 100, nice: 0, sys: 20, idle: 200, irq: 5, iowait: 0 } },
  ],
  loadavg: () => [0.5, 0.4, 0.3],
  totalmem: () => 2048,
  freemem: () => 1024,
  uptime: () => 60,
}))

beforeEach(() => {
  vi.restoreAllMocks()
})

function makeService(): SystemMetricsService {
  const ctx = new Context()
  const service = new SystemMetricsService(ctx)
  return service
}

describe('SystemMetricsService', () => {
  it('binds the systemMetrics Remote namespace', () => {
    expect(makeService().typertRemote).toMatchObject({ serviceKey: 'systemMetrics', namespace: 'systemMetrics' })
  })

  it('snapshot projects os state with the since-boot CPU busy ratio', () => {
    // Per core: busy = 100 + 0 + 20 + 5 = 125; total = 125 + 200 = 325.
    // Two identical cores: busy 250 / total 650.
    const snapshot = makeService().snapshot()
    expect(snapshot.loadavg).toEqual([0.5, 0.4, 0.3])
    expect(snapshot.cpuBusyRatio).toBeCloseTo(250 / 650, 6)
    expect(snapshot.totalMemoryBytes).toBe(2048)
    expect(snapshot.freeMemoryBytes).toBe(1024)
    expect(snapshot.uptimeSeconds).toBe(60)
    expect(snapshot.timestamp).toBeGreaterThan(0)
  })

  it('snapshot handles a zero-total CPU case without division by zero', async () => {
    const { cpus } = await import('node:os')
    vi.mocked(cpus).mockReturnValue([{ times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }] as any)
    const snapshot = makeService().snapshot()
    expect(snapshot.cpuBusyRatio).toBe(0)
  })
})

/** System-monitor Host Remote serving `node:os` resource snapshots to the browser. */

import { execFile as execFileCb } from 'node:child_process'
import { open, readdir, stat as statAsync, writeFile as writeFileAsync } from 'node:fs/promises'
import { promisify } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { cpus, freemem, loadavg, networkInterfaces, totalmem, uptime } from 'node:os'
import type {
  CoreTimes, DirectoryListing, FilePreview, HardwareInfo, NetworkInfo, ProcessSample,
  StorageInfo, SystemMetricsSnapshot, SystemOverview, WriteResult,
} from './types.ts'

export type * from './types.ts'

const execFile = promisify(execFileCb)

/** Best-effort shell read: empty string on any failure. */
async function run(cmd: string, args: readonly string[]): Promise<string> {
  try {
    const { stdout } = await execFile(cmd, args as string[], { timeout: 5000, encoding: 'utf8' })
    return stdout
  } catch {
    return ''
  }
}

/** CPU busy ratio since boot across all logical cores, 0..1. */
function busyRatio(): number {
  let busy = 0
  let total = 0
  for (const core of cpus()) {
    const coreBusy = core.times.user + core.times.nice + core.times.sys + core.times.irq
    busy += coreBusy
    total += coreBusy + core.times.idle
  }
  return total === 0 ? 0 : busy / total
}

/** Raw cumulative tick counts per logical core (client computes usage deltas). */
function coresTimes(): CoreTimes[] {
  return cpus().map(core => ({ ...core.times }))
}

/** Swap totals in bytes; zeros when the platform exposes none. */
async function swapUsage(): Promise<{ totalBytes: number; usedBytes: number }> {
  if (process.platform === 'darwin') {
    const out = await run('sysctl', ['-n', 'vm.swapusage'])
    const match = /total = ([\d.]+)M\s+used = ([\d.]+)M/.exec(out)
    if (match !== null) {
      return {
        totalBytes: Math.round(Number(match[1]) * 1048576),
        usedBytes: Math.round(Number(match[2]) * 1048576),
      }
    }
  } else if (process.platform === 'linux') {
    const out = await run('sh', ['-c', 'grep -E "^(SwapTotal|SwapFree):" /proc/meminfo'])
    const totalKb = Number(/(?:^|\n)SwapTotal:\s+(\d+) kB/.exec(out)?.[1] ?? 0)
    const freeKb = Number(/(?:^|\n)SwapFree:\s+(\d+) kB/.exec(out)?.[1] ?? 0)
    return { totalBytes: totalKb * 1024, usedBytes: (totalKb - freeKb) * 1024 }
  }
  return { totalBytes: 0, usedBytes: 0 }
}

/** CPU thermal reading when the platform exposes one without privileges, else null. */
async function thermalLevel(): Promise<number | null> {
  if (process.platform === 'darwin') {
    const value = Number((await run('sysctl', ['-n', 'machdep.xcpm.cpu_therm_level'])).trim())
    return Number.isFinite(value) ? value : null
  }
  if (process.platform === 'linux') {
    const value = Number((await run('sh', ['-c', 'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null'])).trim())
    return Number.isFinite(value) ? Math.round(value / 1000) : null
  }
  return null
}

/** Power state when readable: 'CHARGE' | 'AC' | 'BATTERY', else null. */
async function powerState(): Promise<string | null> {
  if (process.platform === 'darwin') {
    const out = await run('pmset', ['-g', 'batt'])
    if (out.includes('charging')) return 'CHARGE'
    if (out.includes('AC Power')) return 'AC'
    if (out.includes('Battery Power')) return 'BATTERY'
    return null
  }
  if (process.platform === 'linux') {
    const status = (await run('sh', ['-c', 'cat /sys/class/power_supply/*/status 2>/dev/null | head -1'])).trim()
    if (status === 'Charging' || status === 'Full') return 'CHARGE'
    if (status === 'Discharging') return 'BATTERY'
    return null
  }
  return null
}

/** Static hardware identity, read once and cached. */
let hardwareCache: HardwareInfo | undefined
async function hardwareInfo(): Promise<HardwareInfo> {
  if (hardwareCache !== undefined) return hardwareCache
  let manufacturer = 'Unknown'
  let model = 'Unknown'
  let chassis = 'Unknown'
  if (process.platform === 'darwin') {
    manufacturer = 'Apple Inc.'
    chassis = 'Laptop'
    model = (await run('sysctl', ['-n', 'hw.model'])).trim() || 'Unknown'
  } else if (process.platform === 'linux') {
    manufacturer = (await run('sh', ['-c', 'cat /sys/class/dmi/id/sys_vendor 2>/dev/null'])).trim() || 'Unknown'
    model = (await run('sh', ['-c', 'cat /sys/class/dmi/id/product_name 2>/dev/null'])).trim() || 'Unknown'
    const chassisType = (await run('sh', ['-c', 'cat /sys/class/dmi/id/chassis_type 2>/dev/null'])).trim()
    chassis = chassisType === '10' || chassisType === '9' || chassisType === '8'
      ? 'Notebook'
      : chassisType === '3' ? 'Desktop' : chassisType === '' ? 'Unknown' : `Type ${chassisType}`
  }
  hardwareCache = { manufacturer, model, chassis }
  return hardwareCache
}

/** Top processes by CPU usage, descending. */
async function topProcesses(limit = 10): Promise<ProcessSample[]> {
  const args = process.platform === 'darwin'
    ? ['-axo', 'pid=,comm=,%cpu=,%mem=', '-r']
    : ['-axo', 'pid=,comm=,%cpu=,%mem=', '--sort=-%cpu']
  const out = await run('ps', args)
  const rows: ProcessSample[] = []
  for (const line of out.split('\n')) {
    const match = /^\s*(\d+)\s+(.*?)\s+([\d.]+)\s+([\d.]+)\s*$/.exec(line)
    if (match === null) continue
    rows.push({
      pid: Number(match[1]),
      name: match[2] ?? '',
      cpuPct: Number(match[3]),
      memPct: Number(match[4]),
    })
    if (rows.length >= limit) break
  }
  return rows
}

/** Total active process count. */
async function taskCount(): Promise<number> {
  const out = await run('ps', ['-axo', 'pid='])
  const trimmed = out.trim()
  return trimmed === '' ? 0 : trimmed.split('\n').length
}

/** The active interface: the first non-internal one with an IPv4 address. */
function activeInterface(): { name: string; ip: string | null } {
  const interfaces = networkInterfaces()
  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const address of addresses ?? []) {
      if (!address.internal && address.family === 'IPv4') return { name, ip: address.address }
    }
  }
  return { name: '—', ip: null }
}

/** Cumulative rx/tx bytes on the active interface (netstat/proc counters). */
async function interfaceBytes(name: string): Promise<{ rxBytes: number; txBytes: number }> {
  if (process.platform === 'darwin') {
    const out = await run('netstat', ['-ib'])
    // One line per interface/address; the address-less line carries counters:
    // Name Mtu Network Address Ipkts Ierrs Ibytes Opkts Oerrs Obytes Coll
    const lines = out.split('\n')
    const header = lines.find(line => line.includes('Ibytes'))
    const indexOfIbytes = header?.indexOf('Ibytes') ?? -1
    const indexOfObytes = header?.indexOf('Obytes') ?? -1
    for (const line of lines) {
      const match = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`).exec(line)
      if (match === null) continue
      const rx = Number((line.slice(indexOfIbytes).split(/\s+/)[0] ?? '0'))
      const tx = Number((line.slice(indexOfObytes).split(/\s+/)[0] ?? '0'))
      if (Number.isFinite(rx) && Number.isFinite(tx)) return { rxBytes: rx, txBytes: tx }
    }
    return { rxBytes: 0, txBytes: 0 }
  }
  if (process.platform === 'linux') {
    const out = await run('sh', ['-c', `grep "${name}:" /proc/net/dev`])
    const match = /:\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/.exec(out)
    if (match !== null) return { rxBytes: Number(match[1]), txBytes: Number(match[2]) }
    return { rxBytes: 0, txBytes: 0 }
  }
  return { rxBytes: 0, txBytes: 0 }
}

/** Round-trip ping to 8.8.8.8 in ms, or null when unreachable. */
async function pingMs(): Promise<number | null> {
  const args = process.platform === 'darwin'
    ? ['-c', '1', '-t', '2', '8.8.8.8']
    : ['-c', '1', '-W', '2', '8.8.8.8']
  const out = await run('ping', args)
  const match = /time=([\d.]+)\s*ms/.exec(out)
  return match === null ? null : Number(match[1])
}

/** Storage usage of the process cwd's mount. */
async function storageInfo(): Promise<StorageInfo> {
  const path = process.cwd()
  if (process.platform === 'darwin' || process.platform === 'linux') {
    const out = await run('df', ['-k', path])
    const lines = out.trim().split('\n').slice(1)
    const match = /^[\S]+\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)%/.exec(lines[0] ?? '')
    if (match !== null) {
      const totalBytes = Number(match[1]) * 1024
      const usedBytes = Number(match[2]) * 1024
      return { path, totalBytes, usedBytes, usedPct: Number(match[4]) }
    }
  }
  return { path, totalBytes: 0, usedBytes: 0, usedPct: 0 }
}

/**
 * Remote-only service exposing host resource snapshots to the browser. Every
 * snapshot is projected directly from `node:os` at call time; no cache exists
 * to synchronize.
 * @typert service systemMetrics
 */
export class SystemMetricsService extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, 'systemMetrics')
  }

  /**
   * Read the current host resource state.
   * @returns load averages, since-boot CPU busy ratio, memory, and uptime.
   */
  @Remote('snapshot')
  snapshot(): SystemMetricsSnapshot {
    return {
      loadavg: loadavg() as [number, number, number],
      cpuBusyRatio: busyRatio(),
      totalMemoryBytes: totalmem(),
      freeMemoryBytes: freemem(),
      uptimeSeconds: uptime(),
      timestamp: Date.now(),
    }
  }

  /**
   * Read the rich system overview for the left system panel: per-core CPU
   * tick counts (the client computes usage deltas between polls), memory and
   * swap, thermal/power/hardware (best-effort), and top processes.
   * @returns the overview.
   */
  @Remote('overview')
  async overview(): Promise<SystemOverview> {
    const memoryTotal = totalmem()
    const memoryFree = freemem()
    const active = activeInterface()
    const [swap, thermal, power, hardware, processes, tasks, bytes, ping, storage] = await Promise.all([
      swapUsage(),
      thermalLevel(),
      powerState(),
      hardwareInfo(),
      topProcesses(),
      taskCount(),
      interfaceBytes(active.name),
      pingMs(),
      storageInfo(),
    ])
    const network: NetworkInfo = {
      interfaceName: active.name,
      state: active.ip === null ? 'IPv4 OFFLINE' : 'IPv4 ONLINE',
      ip: active.ip,
      pingMs: ping,
      rxBytes: bytes.rxBytes,
      txBytes: bytes.txBytes,
    }
    return {
      timestamp: Date.now(),
      platform: process.platform,
      uptimeSeconds: uptime(),
      loadavg: loadavg() as [number, number, number],
      memory: { totalBytes: memoryTotal, usedBytes: memoryTotal - memoryFree },
      swap,
      cores: coresTimes(),
      thermalLevel: thermal,
      powerState: power,
      hardware,
      tasks,
      processes,
      network,
      storage,
    }
  }

  /**
   * List one directory for the filesystem browser.
   * @param path - absolute directory to list.
   * @returns the listing (or an error string when unreadable).
   */
  @Remote('listDirectory')
  async listDirectory(path: string): Promise<DirectoryListing> {
    try {
      const dirents = await readdir(path, { withFileTypes: true })
      const entries = dirents
        .map(dirent => ({ name: dirent.name, isDirectory: dirent.isDirectory() }))
        .sort((left, right) =>
          Number(right.isDirectory) - Number(left.isDirectory)
          || left.name.localeCompare(right.name))
      return { path, entries, error: null }
    } catch (error) {
      return { path, entries: [], error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Read one file for the bottom-right preview pane / editor. Text payloads
   * are capped at 4 MiB, images at 4 MiB, videos at 12 MiB; oversized files
   * are truncated and flagged rather than refused. Kind is decided by
   * extension with a UTF-8 sniff fallback for unknown extensions.
   * @param path - absolute file path.
   * @returns the preview payload (or an error string when unreadable).
   */
  @Remote('readFile')
  async readFile(path: string): Promise<FilePreview> {
    try {
      const info = await statAsync(path)
      if (info.isDirectory()) {
        return { path, kind: 'unsupported', mime: '', sizeBytes: 0, truncated: false, text: null, dataUrl: null, error: 'is a directory' }
      }
      const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
      const byExtension = previewKindOf(extension)
      if (byExtension !== null && byExtension.kind !== 'text') {
        const cap = byExtension.kind === 'image' ? PREVIEW_IMAGE_CAP : PREVIEW_VIDEO_CAP
        const buffer = await readFirst(path, Math.min(info.size, cap))
        return {
          path,
          kind: byExtension.kind,
          mime: byExtension.mime,
          sizeBytes: info.size,
          truncated: info.size > cap,
          text: null,
          dataUrl: `data:${byExtension.mime};base64,${buffer.toString('base64')}`,
          error: null,
        }
      }
      // Text (by extension, or sniffed): read the text cap.
      const sample = await readFirst(path, Math.min(info.size, 8192))
      const kind = byExtension ?? sniffTextKind(sample)
      if (kind === null) {
        return { path, kind: 'unsupported', mime: 'application/octet-stream', sizeBytes: info.size, truncated: info.size > PREVIEW_TEXT_CAP, text: null, dataUrl: null, error: null }
      }
      const buffer = info.size > PREVIEW_TEXT_CAP
        ? await readFirst(path, PREVIEW_TEXT_CAP)
        : sample
      return {
        path,
        kind: 'text',
        mime: kind.mime,
        sizeBytes: info.size,
        truncated: info.size > PREVIEW_TEXT_CAP,
        text: buffer.toString('utf8'),
        dataUrl: null,
        error: null,
      }
    } catch (error) {
      return {
        path,
        kind: 'unsupported',
        mime: '',
        sizeBytes: 0,
        truncated: false,
        text: null,
        dataUrl: null,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Write one text file from the bottom-right editor. Creates or replaces the
   * file at `path` with the given UTF-8 content; the parent directory must
   * exist. Trust surface matches `readFile`: the GUI already reads arbitrary
   * paths the host process can reach, so writing carries the same parity.
   * @param path - absolute file path.
   * @param content - full text content to persist.
   * @returns the write result (or an error string when unwritable).
   */
  @Remote('writeFile')
  async writeFile(path: string, content: string): Promise<WriteResult> {
    try {
      await writeFileAsync(path, content, 'utf8')
      return { path, sizeBytes: Buffer.byteLength(content, 'utf8'), error: null }
    } catch (error) {
      return { path, sizeBytes: 0, error: error instanceof Error ? error.message : String(error) }
    }
  }
}

/** Read at most `length` bytes from the file start. */
async function readFirst(path: string, length: number): Promise<Buffer> {
  const handle = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(length)
    const { bytesRead } = await handle.read(buffer, 0, length, 0)
    return bytesRead === length ? buffer : buffer.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

/** Preview payload caps (bytes). */
const PREVIEW_TEXT_CAP = 4 * 1024 * 1024
const PREVIEW_IMAGE_CAP = 4 * 1024 * 1024
const PREVIEW_VIDEO_CAP = 12 * 1024 * 1024

/** Image MIME by extension. */
const IMAGE_MIME: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
}

/** Video MIME by extension. */
const VIDEO_MIME: Readonly<Record<string, string>> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
}

/** Extensions treated as plain text. */
const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  'txt', 'text', 'md', 'markdown', 'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'log', 'csv',
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'css', 'scss', 'html', 'htm', 'xml', 'sh', 'bash', 'zsh',
  'py', 'rb', 'go', 'rs', 'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'php', 'sql', 'env', 'lock',
])

/** Decide the preview kind from the file extension (null = sniff). */
function previewKindOf(extension: string): { kind: 'text' | 'image' | 'video'; mime: string } | null {
  const imageMime = IMAGE_MIME[extension]
  if (imageMime !== undefined) return { kind: 'image', mime: imageMime }
  const videoMime = VIDEO_MIME[extension]
  if (videoMime !== undefined) return { kind: 'video', mime: videoMime }
  if (TEXT_EXTENSIONS.has(extension)) return { kind: 'text', mime: 'text/plain' }
  return null
}

/** UTF-8 sniff: no NUL bytes and few control bytes → likely plain text. */
function sniffTextKind(sample: Buffer): { kind: 'text'; mime: string } | null {
  let control = 0
  for (const byte of sample) {
    if (byte === 0) return null
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) control += 1
  }
  return sample.length > 0 && control / sample.length < 0.05
    ? { kind: 'text', mime: 'text/plain' }
    : null
}

export default SystemMetricsService

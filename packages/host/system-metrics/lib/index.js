import { execFile } from "node:child_process";
import { open, readdir, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { cpus, freemem, loadavg, networkInterfaces, totalmem, uptime } from "node:os";
//#region lib/types/index.js
/** System-monitor Host Remote serving `node:os` resource snapshots to the browser. */
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
const execFile$1 = promisify(execFile);
/** Best-effort shell read: empty string on any failure. */
async function run(cmd, args) {
	try {
		const { stdout } = await execFile$1(cmd, args, {
			timeout: 5e3,
			encoding: "utf8"
		});
		return stdout;
	} catch {
		return "";
	}
}
/** CPU busy ratio since boot across all logical cores, 0..1. */
function busyRatio() {
	let busy = 0;
	let total = 0;
	for (const core of cpus()) {
		const coreBusy = core.times.user + core.times.nice + core.times.sys + core.times.irq;
		busy += coreBusy;
		total += coreBusy + core.times.idle;
	}
	return total === 0 ? 0 : busy / total;
}
/** Raw cumulative tick counts per logical core (client computes usage deltas). */
function coresTimes() {
	return cpus().map((core) => ({ ...core.times }));
}
/** Swap totals in bytes; zeros when the platform exposes none. */
async function swapUsage() {
	if (process.platform === "darwin") {
		const out = await run("sysctl", ["-n", "vm.swapusage"]);
		const match = /total = ([\d.]+)M\s+used = ([\d.]+)M/.exec(out);
		if (match !== null) return {
			totalBytes: Math.round(Number(match[1]) * 1048576),
			usedBytes: Math.round(Number(match[2]) * 1048576)
		};
	} else if (process.platform === "linux") {
		const out = await run("sh", ["-c", "grep -E \"^(SwapTotal|SwapFree):\" /proc/meminfo"]);
		const totalKb = Number(/(?:^|\n)SwapTotal:\s+(\d+) kB/.exec(out)?.[1] ?? 0);
		const freeKb = Number(/(?:^|\n)SwapFree:\s+(\d+) kB/.exec(out)?.[1] ?? 0);
		return {
			totalBytes: totalKb * 1024,
			usedBytes: (totalKb - freeKb) * 1024
		};
	}
	return {
		totalBytes: 0,
		usedBytes: 0
	};
}
/** CPU thermal reading when the platform exposes one without privileges, else null. */
async function thermalLevel() {
	if (process.platform === "darwin") {
		const value = Number((await run("sysctl", ["-n", "machdep.xcpm.cpu_therm_level"])).trim());
		return Number.isFinite(value) ? value : null;
	}
	if (process.platform === "linux") {
		const value = Number((await run("sh", ["-c", "cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null"])).trim());
		return Number.isFinite(value) ? Math.round(value / 1e3) : null;
	}
	return null;
}
/** Power state when readable: 'CHARGE' | 'AC' | 'BATTERY', else null. */
async function powerState() {
	if (process.platform === "darwin") {
		const out = await run("pmset", ["-g", "batt"]);
		if (out.includes("charging")) return "CHARGE";
		if (out.includes("AC Power")) return "AC";
		if (out.includes("Battery Power")) return "BATTERY";
		return null;
	}
	if (process.platform === "linux") {
		const status = (await run("sh", ["-c", "cat /sys/class/power_supply/*/status 2>/dev/null | head -1"])).trim();
		if (status === "Charging" || status === "Full") return "CHARGE";
		if (status === "Discharging") return "BATTERY";
		return null;
	}
	return null;
}
/** Static hardware identity, read once and cached. */
let hardwareCache;
async function hardwareInfo() {
	if (hardwareCache !== void 0) return hardwareCache;
	let manufacturer = "Unknown";
	let model = "Unknown";
	let chassis = "Unknown";
	if (process.platform === "darwin") {
		manufacturer = "Apple Inc.";
		chassis = "Laptop";
		model = (await run("sysctl", ["-n", "hw.model"])).trim() || "Unknown";
	} else if (process.platform === "linux") {
		manufacturer = (await run("sh", ["-c", "cat /sys/class/dmi/id/sys_vendor 2>/dev/null"])).trim() || "Unknown";
		model = (await run("sh", ["-c", "cat /sys/class/dmi/id/product_name 2>/dev/null"])).trim() || "Unknown";
		const chassisType = (await run("sh", ["-c", "cat /sys/class/dmi/id/chassis_type 2>/dev/null"])).trim();
		chassis = chassisType === "10" || chassisType === "9" || chassisType === "8" ? "Notebook" : chassisType === "3" ? "Desktop" : chassisType === "" ? "Unknown" : `Type ${chassisType}`;
	}
	hardwareCache = {
		manufacturer,
		model,
		chassis
	};
	return hardwareCache;
}
/** Top processes by CPU usage, descending. */
async function topProcesses(limit = 10) {
	const out = await run("ps", process.platform === "darwin" ? [
		"-axo",
		"pid=,comm=,%cpu=,%mem=",
		"-r"
	] : [
		"-axo",
		"pid=,comm=,%cpu=,%mem=",
		"--sort=-%cpu"
	]);
	const rows = [];
	for (const line of out.split("\n")) {
		const match = /^\s*(\d+)\s+(.*?)\s+([\d.]+)\s+([\d.]+)\s*$/.exec(line);
		if (match === null) continue;
		rows.push({
			pid: Number(match[1]),
			name: match[2] ?? "",
			cpuPct: Number(match[3]),
			memPct: Number(match[4])
		});
		if (rows.length >= limit) break;
	}
	return rows;
}
/** Total active process count. */
async function taskCount() {
	const trimmed = (await run("ps", ["-axo", "pid="])).trim();
	return trimmed === "" ? 0 : trimmed.split("\n").length;
}
/** The active interface: the first non-internal one with an IPv4 address. */
function activeInterface() {
	const interfaces = networkInterfaces();
	for (const [name, addresses] of Object.entries(interfaces)) for (const address of addresses ?? []) if (!address.internal && address.family === "IPv4") return {
		name,
		ip: address.address
	};
	return {
		name: "—",
		ip: null
	};
}
/** Cumulative rx/tx bytes on the active interface (netstat/proc counters). */
async function interfaceBytes(name) {
	if (process.platform === "darwin") {
		const lines = (await run("netstat", ["-ib"])).split("\n");
		const header = lines.find((line) => line.includes("Ibytes"));
		const indexOfIbytes = header?.indexOf("Ibytes") ?? -1;
		const indexOfObytes = header?.indexOf("Obytes") ?? -1;
		for (const line of lines) {
			if (new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s`).exec(line) === null) continue;
			const rx = Number(line.slice(indexOfIbytes).split(/\s+/)[0] ?? "0");
			const tx = Number(line.slice(indexOfObytes).split(/\s+/)[0] ?? "0");
			if (Number.isFinite(rx) && Number.isFinite(tx)) return {
				rxBytes: rx,
				txBytes: tx
			};
		}
		return {
			rxBytes: 0,
			txBytes: 0
		};
	}
	if (process.platform === "linux") {
		const out = await run("sh", ["-c", `grep "${name}:" /proc/net/dev`]);
		const match = /:\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/.exec(out);
		if (match !== null) return {
			rxBytes: Number(match[1]),
			txBytes: Number(match[2])
		};
		return {
			rxBytes: 0,
			txBytes: 0
		};
	}
	return {
		rxBytes: 0,
		txBytes: 0
	};
}
/** Round-trip ping to 8.8.8.8 in ms, or null when unreachable. */
async function pingMs() {
	const out = await run("ping", process.platform === "darwin" ? [
		"-c",
		"1",
		"-t",
		"2",
		"8.8.8.8"
	] : [
		"-c",
		"1",
		"-W",
		"2",
		"8.8.8.8"
	]);
	const match = /time=([\d.]+)\s*ms/.exec(out);
	return match === null ? null : Number(match[1]);
}
/** Storage usage of the process cwd's mount. */
async function storageInfo() {
	const path = process.cwd();
	if (process.platform === "darwin" || process.platform === "linux") {
		const lines = (await run("df", ["-k", path])).trim().split("\n").slice(1);
		const match = /^[\S]+\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)%/.exec(lines[0] ?? "");
		if (match !== null) return {
			path,
			totalBytes: Number(match[1]) * 1024,
			usedBytes: Number(match[2]) * 1024,
			usedPct: Number(match[4])
		};
	}
	return {
		path,
		totalBytes: 0,
		usedBytes: 0,
		usedPct: 0
	};
}
/**
* Remote-only service exposing host resource snapshots to the browser. Every
* snapshot is projected directly from `node:os` at call time; no cache exists
* to synchronize.
*/
let SystemMetricsService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _snapshot_decorators;
	let _overview_decorators;
	let _listDirectory_decorators;
	let _readFile_decorators;
	return class SystemMetricsService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_snapshot_decorators = [Remote("snapshot")];
			_overview_decorators = [Remote("overview")];
			_listDirectory_decorators = [Remote("listDirectory")];
			_readFile_decorators = [Remote("readFile")];
			__esDecorate(this, null, _snapshot_decorators, {
				kind: "method",
				name: "snapshot",
				static: false,
				private: false,
				access: {
					has: (obj) => "snapshot" in obj,
					get: (obj) => obj.snapshot
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _overview_decorators, {
				kind: "method",
				name: "overview",
				static: false,
				private: false,
				access: {
					has: (obj) => "overview" in obj,
					get: (obj) => obj.overview
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listDirectory_decorators, {
				kind: "method",
				name: "listDirectory",
				static: false,
				private: false,
				access: {
					has: (obj) => "listDirectory" in obj,
					get: (obj) => obj.listDirectory
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _readFile_decorators, {
				kind: "method",
				name: "readFile",
				static: false,
				private: false,
				access: {
					has: (obj) => "readFile" in obj,
					get: (obj) => obj.readFile
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		constructor(ctx) {
			super(ctx, "systemMetrics");
			__runInitializers(this, _instanceExtraInitializers);
		}
		/**
		* Read the current host resource state.
		* @returns load averages, since-boot CPU busy ratio, memory, and uptime.
		*/
		snapshot() {
			return {
				loadavg: loadavg(),
				cpuBusyRatio: busyRatio(),
				totalMemoryBytes: totalmem(),
				freeMemoryBytes: freemem(),
				uptimeSeconds: uptime(),
				timestamp: Date.now()
			};
		}
		/**
		* Read the rich system overview for the left system panel: per-core CPU
		* tick counts (the client computes usage deltas between polls), memory and
		* swap, thermal/power/hardware (best-effort), and top processes.
		* @returns the overview.
		*/
		async overview() {
			const memoryTotal = totalmem();
			const memoryFree = freemem();
			const active = activeInterface();
			const [swap, thermal, power, hardware, processes, tasks, bytes, ping, storage] = await Promise.all([
				swapUsage(),
				thermalLevel(),
				powerState(),
				hardwareInfo(),
				topProcesses(),
				taskCount(),
				interfaceBytes(active.name),
				pingMs(),
				storageInfo()
			]);
			const network = {
				interfaceName: active.name,
				state: active.ip === null ? "IPv4 OFFLINE" : "IPv4 ONLINE",
				ip: active.ip,
				pingMs: ping,
				rxBytes: bytes.rxBytes,
				txBytes: bytes.txBytes
			};
			return {
				timestamp: Date.now(),
				platform: process.platform,
				uptimeSeconds: uptime(),
				loadavg: loadavg(),
				memory: {
					totalBytes: memoryTotal,
					usedBytes: memoryTotal - memoryFree
				},
				swap,
				cores: coresTimes(),
				thermalLevel: thermal,
				powerState: power,
				hardware,
				tasks,
				processes,
				network,
				storage
			};
		}
		/**
		* List one directory for the filesystem browser.
		* @param path - absolute directory to list.
		* @returns the listing (or an error string when unreadable).
		*/
		async listDirectory(path) {
			try {
				return {
					path,
					entries: (await readdir(path, { withFileTypes: true })).map((dirent) => ({
						name: dirent.name,
						isDirectory: dirent.isDirectory()
					})).sort((left, right) => Number(right.isDirectory) - Number(left.isDirectory) || left.name.localeCompare(right.name)),
					error: null
				};
			} catch (error) {
				return {
					path,
					entries: [],
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}
		/**
		* Read one file for the bottom-right preview pane. Text payloads are
		* capped at 64 KiB, images at 4 MiB, videos at 12 MiB; oversized files are
		* truncated and flagged rather than refused. Kind is decided by extension
		* with a UTF-8 sniff fallback for unknown extensions.
		* @param path - absolute file path.
		* @returns the preview payload (or an error string when unreadable).
		*/
		async readFile(path) {
			try {
				const info = await stat(path);
				if (info.isDirectory()) return {
					path,
					kind: "unsupported",
					mime: "",
					sizeBytes: 0,
					truncated: false,
					text: null,
					dataUrl: null,
					error: "is a directory"
				};
				const byExtension = previewKindOf(path.slice(path.lastIndexOf(".") + 1).toLowerCase());
				if (byExtension !== null && byExtension.kind !== "text") {
					const cap = byExtension.kind === "image" ? PREVIEW_IMAGE_CAP : PREVIEW_VIDEO_CAP;
					const buffer = await readFirst(path, Math.min(info.size, cap));
					return {
						path,
						kind: byExtension.kind,
						mime: byExtension.mime,
						sizeBytes: info.size,
						truncated: info.size > cap,
						text: null,
						dataUrl: `data:${byExtension.mime};base64,${buffer.toString("base64")}`,
						error: null
					};
				}
				const sample = await readFirst(path, Math.min(info.size, 8192));
				const kind = byExtension ?? sniffTextKind(sample);
				if (kind === null) return {
					path,
					kind: "unsupported",
					mime: "application/octet-stream",
					sizeBytes: info.size,
					truncated: info.size > PREVIEW_TEXT_CAP,
					text: null,
					dataUrl: null,
					error: null
				};
				const buffer = info.size > PREVIEW_TEXT_CAP ? await readFirst(path, PREVIEW_TEXT_CAP) : sample;
				return {
					path,
					kind: "text",
					mime: kind.mime,
					sizeBytes: info.size,
					truncated: info.size > PREVIEW_TEXT_CAP,
					text: buffer.toString("utf8"),
					dataUrl: null,
					error: null
				};
			} catch (error) {
				return {
					path,
					kind: "unsupported",
					mime: "",
					sizeBytes: 0,
					truncated: false,
					text: null,
					dataUrl: null,
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}
	};
})();
/** Read at most `length` bytes from the file start. */
async function readFirst(path, length) {
	const handle = await open(path, "r");
	try {
		const buffer = Buffer.alloc(length);
		const { bytesRead } = await handle.read(buffer, 0, length, 0);
		return bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
	} finally {
		await handle.close();
	}
}
/** Preview payload caps (bytes). */
const PREVIEW_TEXT_CAP = 64 * 1024;
const PREVIEW_IMAGE_CAP = 4 * 1024 * 1024;
const PREVIEW_VIDEO_CAP = 12 * 1024 * 1024;
/** Image MIME by extension. */
const IMAGE_MIME = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	bmp: "image/bmp",
	ico: "image/x-icon",
	avif: "image/avif"
};
/** Video MIME by extension. */
const VIDEO_MIME = {
	mp4: "video/mp4",
	m4v: "video/mp4",
	webm: "video/webm",
	ogv: "video/ogg",
	ogg: "video/ogg",
	mov: "video/quicktime"
};
/** Extensions treated as plain text. */
const TEXT_EXTENSIONS = new Set([
	"txt",
	"text",
	"md",
	"markdown",
	"json",
	"yaml",
	"yml",
	"toml",
	"ini",
	"cfg",
	"conf",
	"log",
	"csv",
	"ts",
	"tsx",
	"js",
	"jsx",
	"mjs",
	"cjs",
	"css",
	"scss",
	"html",
	"htm",
	"xml",
	"sh",
	"bash",
	"zsh",
	"py",
	"rb",
	"go",
	"rs",
	"java",
	"c",
	"h",
	"cpp",
	"hpp",
	"cs",
	"php",
	"sql",
	"env",
	"lock"
]);
/** Decide the preview kind from the file extension (null = sniff). */
function previewKindOf(extension) {
	const imageMime = IMAGE_MIME[extension];
	if (imageMime !== void 0) return {
		kind: "image",
		mime: imageMime
	};
	const videoMime = VIDEO_MIME[extension];
	if (videoMime !== void 0) return {
		kind: "video",
		mime: videoMime
	};
	if (TEXT_EXTENSIONS.has(extension)) return {
		kind: "text",
		mime: "text/plain"
	};
	return null;
}
/** UTF-8 sniff: no NUL bytes and few control bytes → likely plain text. */
function sniffTextKind(sample) {
	let control = 0;
	for (const byte of sample) {
		if (byte === 0) return null;
		if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) control += 1;
	}
	return sample.length > 0 && control / sample.length < .05 ? {
		kind: "text",
		mime: "text/plain"
	} : null;
}
//#endregion
export { SystemMetricsService, SystemMetricsService as default };

import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
//#region lib/types/index.js
/** Browser terminal Host Remote: interactive PTY control over the terminal seam. */
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
/** Runtime mirror: the browser terminal name reserved on the PTY registry. */
const UI_TERMINAL_NAME = "ui-terminal";
/** Remote-only service bridging browser terminal panels to {@link TerminalSessionService}. */
let TerminalUIBridgeService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _open_decorators;
	let _write_decorators;
	let _read_decorators;
	let _signal_decorators;
	let _close_decorators;
	return class TerminalUIBridgeService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_open_decorators = [Remote("open")];
			_write_decorators = [Remote("write")];
			_read_decorators = [Remote("read")];
			_signal_decorators = [Remote("signal")];
			_close_decorators = [Remote("close")];
			__esDecorate(this, null, _open_decorators, {
				kind: "method",
				name: "open",
				static: false,
				private: false,
				access: {
					has: (obj) => "open" in obj,
					get: (obj) => obj.open
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _write_decorators, {
				kind: "method",
				name: "write",
				static: false,
				private: false,
				access: {
					has: (obj) => "write" in obj,
					get: (obj) => obj.write
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _read_decorators, {
				kind: "method",
				name: "read",
				static: false,
				private: false,
				access: {
					has: (obj) => "read" in obj,
					get: (obj) => obj.read
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _signal_decorators, {
				kind: "method",
				name: "signal",
				static: false,
				private: false,
				access: {
					has: (obj) => "signal" in obj,
					get: (obj) => obj.signal
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _close_decorators, {
				kind: "method",
				name: "close",
				static: false,
				private: false,
				access: {
					has: (obj) => "close" in obj,
					get: (obj) => obj.close
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
		static inject = ["terminals"];
		cursors = (__runInitializers(this, _instanceExtraInitializers), /* @__PURE__ */ new Map());
		constructor(ctx) {
			super(ctx, "terminalUI");
		}
		/**
		* Spawn one interactive bash PTY under the session's agent and seed its read
		* cursor so the first poll returns only output after the MOTD.
		* @param agent - exact live Agent resolved from the wire identity.
		* @param request - optional cwd and initial geometry.
		* @returns identity and initial output for the new PTY.
		*/
		async open(agent, request) {
			const req = request ?? {};
			const result = await this.ctx.terminals.spawn(agent, {
				type: "bash",
				name: UI_TERMINAL_NAME,
				...req.cwd !== void 0 ? { cwd: req.cwd } : {},
				...req.rows !== void 0 ? { rows: req.rows } : {},
				...req.cols !== void 0 ? { cols: req.cols } : {}
			});
			const seed = this.ctx.terminals.read(agent, result.sessionId, {
				offset: 0,
				count: 1
			});
			this.cursors.set(result.sessionId, { lastTotalLines: seed.totalLines });
			return {
				id: result.sessionId,
				motd: result.motd
			};
		}
		/**
		* Write raw bytes to one browser PTY without an exclusive send wait.
		* @param agent - exact live Agent resolved from the wire identity.
		* @param request - target identity and raw text.
		*/
		async write(agent, request) {
			this.expectCursor(request.id);
			await this.ctx.terminals.write(agent, request.id, request.text);
		}
		/**
		* Read the next incremental output delta of one browser PTY. The cursor
		* advances by retained line count; a scrollback reset returns the whole
		* retained buffer with `truncated: true` so the client redraws.
		* @param agent - exact live Agent resolved from the wire identity.
		* @param request - target identity.
		* @returns new output since the previous read, or a full redraw on reset.
		*/
		read(agent, request) {
			const cursor = this.expectCursor(request.id);
			const probe = this.ctx.terminals.read(agent, request.id, {
				offset: 0,
				count: 1
			});
			if (!this.ctx.terminals.list(agent).some((session) => session.sessionId === request.id)) {
				this.cursors.delete(request.id);
				return {
					text: "",
					truncated: false,
					exited: true
				};
			}
			if (probe.totalLines < cursor.lastTotalLines) {
				cursor.lastTotalLines = probe.totalLines;
				return {
					text: this.ctx.terminals.read(agent, request.id, { offset: 0 }).text,
					truncated: true,
					exited: false
				};
			}
			const delta = probe.totalLines - cursor.lastTotalLines;
			cursor.lastTotalLines = probe.totalLines;
			if (delta <= 0) return {
				text: "",
				truncated: false,
				exited: false
			};
			const tail = this.ctx.terminals.read(agent, request.id, {
				offset: 0,
				count: delta
			});
			return {
				text: tail.text,
				truncated: tail.truncated,
				exited: false
			};
		}
		/**
		* Deliver one allowed signal to one browser PTY.
		* @param agent - exact live Agent resolved from the wire identity.
		* @param request - target identity and signal name.
		* @returns the delivered foreground process-group identity.
		*/
		signal(agent, request) {
			this.expectCursor(request.id);
			return this.ctx.terminals.signal(agent, request.id, request.signal);
		}
		/**
		* Close one browser PTY and drop its read cursor.
		* @param agent - exact live Agent resolved from the wire identity.
		* @param request - target identity and optional closing reason.
		* @returns whether the session was still open when killed.
		*/
		async close(agent, request) {
			this.expectCursor(request.id);
			this.cursors.delete(request.id);
			return this.ctx.terminals.kill(agent, request.id, request.reason ?? "browser terminal closed");
		}
		/**
		* Require a live cursor for the target identity.
		* @param id - target PTY identity from open.
		* @returns the cursor record.
		*/
		expectCursor(id) {
			const cursor = this.cursors.get(id);
			if (cursor === void 0) throw new Error(`terminalUI: unknown or closed browser terminal "${id}"`);
			return cursor;
		}
	};
})();
//#endregion
export { TerminalUIBridgeService, TerminalUIBridgeService as default };

window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-network-panel",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:/Users/daniel/workspace/dsh-edex-ui/packages/ui-network-panel/src/client/NetworkPanel.module.css.mjs
		const css = ".r4Fs6G_panel{background:var(--dsw-alias-bg-base,#000);height:100%;font-family:var(--ds-font-family-code,\"SF Mono\", \"JetBrains Mono\", Consolas, Menlo, monospace);color:var(--dsw-alias-label-primary,currentColor);flex-direction:column;font-size:11px;line-height:1.5;display:flex;overflow-y:auto}.r4Fs6G_section{border-bottom:1px solid var(--dsw-alias-border-l1,currentColor);padding:10px 12px}.r4Fs6G_title{color:var(--dsw-alias-label-secondary,currentColor);letter-spacing:2px;margin-bottom:6px}.r4Fs6G_specLine{white-space:nowrap;justify-content:space-between;gap:8px;display:flex;overflow:hidden}.r4Fs6G_specLine>span:last-child{text-overflow:ellipsis;overflow:hidden}.r4Fs6G_key{color:var(--dsw-alias-label-secondary,currentColor)}.r4Fs6G_globePane{align-items:center;gap:10px;display:flex}.r4Fs6G_globe{width:140px;color:var(--dsw-alias-label-secondary,currentColor);flex:none}.r4Fs6G_endpoints{flex-direction:column;flex:1;gap:3px;min-width:0;display:flex}.r4Fs6G_endpoint{white-space:nowrap;justify-content:space-between;gap:6px;display:flex}.r4Fs6G_endpointName{color:var(--dsw-alias-label-primary,currentColor)}.r4Fs6G_endpointCoord{color:var(--dsw-alias-label-secondary,currentColor);text-overflow:ellipsis;overflow:hidden}.r4Fs6G_trafficHeader{justify-content:space-between;gap:8px;margin-bottom:4px;display:flex}.r4Fs6G_traffic{width:100%;color:var(--dsw-alias-brand-primary,currentColor)}";
		const tagId = "@deepseek-ai/dsh-client-ui-network-panel/NetworkPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-network-panel";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var NetworkPanel_module_css_default = {
			"title": "r4Fs6G_title",
			"endpoints": "r4Fs6G_endpoints",
			"section": "r4Fs6G_section",
			"endpointName": "r4Fs6G_endpointName",
			"trafficHeader": "r4Fs6G_trafficHeader",
			"endpointCoord": "r4Fs6G_endpointCoord",
			"traffic": "r4Fs6G_traffic",
			"panel": "r4Fs6G_panel",
			"key": "r4Fs6G_key",
			"globePane": "r4Fs6G_globePane",
			"endpoint": "r4Fs6G_endpoint",
			"specLine": "r4Fs6G_specLine",
			"globe": "r4Fs6G_globe"
		};
		//#endregion
		//#region src/client/NetworkPanel.tsx
		/**
		* Right network panel: interface status header, rotating wireframe globe with
		* endpoint coordinates, and a dual up/down traffic sparkline.
		*/
		/** Sample endpoints (lat/lon) drawn on the globe. */
		const ENDPOINTS = [
			{
				label: "US-WEST",
				lat: 34.05,
				lon: -118.24
			},
			{
				label: "US-EAST",
				lat: 40.71,
				lon: -74.01
			},
			{
				label: "EU-CENTRAL",
				lat: 48.86,
				lon: 2.35
			},
			{
				label: "AP-SOUTH",
				lat: 1.35,
				lon: 103.82
			},
			{
				label: "AP-NORTHEAST",
				lat: 35.68,
				lon: 139.69
			}
		];
		/** Project lat/lon to the globe's 2D disc (rotation phase in degrees). */
		function project(lat, lon, phase, radius) {
			const lonRad = (lon + phase) * Math.PI / 180;
			const latRad = lat * Math.PI / 180;
			const cosLon = Math.cos(lonRad);
			return {
				x: radius * Math.cos(latRad) * cosLon,
				y: -radius * Math.sin(latRad),
				visible: cosLon > 0
			};
		}
		/** Rotating wireframe globe (meridians + parallels + endpoint dots). */
		function Globe() {
			const [phase, setPhase] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				let raf = 0;
				const tick = () => {
					setPhase((value) => value + .4);
					raf = requestAnimationFrame(tick);
				};
				raf = requestAnimationFrame(tick);
				return () => {
					cancelAnimationFrame(raf);
				};
			}, []);
			const radius = 52;
			const cx = 70;
			const cy = 62;
			const meridians = [
				0,
				30,
				60,
				90,
				120,
				150
			].map((offset) => {
				const pts = [];
				for (let lat = -90; lat <= 90; lat += 15) {
					const p = project(lat, offset, phase, radius);
					pts.push(`${(cx + p.x).toFixed(1)},${(cy + p.y).toFixed(1)}`);
				}
				return pts.join(" ");
			});
			const parallels = [
				-60,
				-30,
				0,
				30,
				60
			].map((lat) => {
				const pts = [];
				for (let lon = 0; lon <= 360; lon += 15) {
					const p = project(lat, lon, phase, radius);
					pts.push(`${(cx + p.x).toFixed(1)},${(cy + p.y).toFixed(1)}`);
				}
				return pts.join(" ");
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: NetworkPanel_module_css_default.globe,
				viewBox: "0 0 140 124",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx,
						cy,
						r: radius,
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "1",
						opacity: "0.7"
					}),
					meridians.map((points, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
						points,
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "0.5",
						opacity: "0.45"
					}, `m${index}`)),
					parallels.map((points, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
						points,
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "0.5",
						opacity: "0.45"
					}, `p${index}`)),
					ENDPOINTS.map((endpoint) => {
						const p = project(endpoint.lat, endpoint.lon, phase, radius);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							cx: cx + p.x,
							cy: cy + p.y,
							r: 2,
							fill: p.visible ? "currentColor" : "none",
							stroke: "currentColor",
							strokeWidth: "0.75",
							opacity: p.visible ? 1 : .3
						}, endpoint.label);
					})
				]
			});
		}
		/** Dual up/down sparkline. */
		function TrafficChart({ up, down }) {
			const width = 160;
			const height = 36;
			const toPoints = (series) => {
				const max = Math.max(1, ...series);
				return series.map((value, index) => {
					const x = series.length <= 1 ? 0 : index / (series.length - 1) * width;
					const y = height - value / max * height;
					return `${x.toFixed(1)},${y.toFixed(1)}`;
				}).join(" ");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: NetworkPanel_module_css_default.traffic,
				width,
				height,
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
					points: toPoints(down),
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1",
					opacity: "0.9"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
					points: toPoints(up),
					fill: "none",
					stroke: "#e0c05a",
					strokeWidth: "1",
					opacity: "0.9"
				})]
			});
		}
		function NetworkPanel({ useNetwork }) {
			const network = useNetwork((s) => s);
			const [now, setNow] = (0, react.useState)(() => /* @__PURE__ */ new Date());
			(0, react.useEffect)(() => {
				const timer = setInterval(() => setNow(/* @__PURE__ */ new Date()), 1e3);
				return () => {
					clearInterval(timer);
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: NetworkPanel_module_css_default.panel,
				"data-testid": "network-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: NetworkPanel_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: NetworkPanel_module_css_default.title,
								children: "NETWORK STATUS"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: NetworkPanel_module_css_default.specLine,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: NetworkPanel_module_css_default.key,
									children: "INTERFACE"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: network.network.interfaceName })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: NetworkPanel_module_css_default.specLine,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: NetworkPanel_module_css_default.key,
									children: "STATE"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: network.network.state })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: NetworkPanel_module_css_default.specLine,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: NetworkPanel_module_css_default.key,
									children: "IP"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: network.network.ip ?? "—" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: NetworkPanel_module_css_default.specLine,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: NetworkPanel_module_css_default.key,
									children: "PING"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: network.network.pingMs === null ? "—" : `${network.network.pingMs.toFixed(0)}ms` })]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: NetworkPanel_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: NetworkPanel_module_css_default.title,
							children: "WORLD VIEW"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: NetworkPanel_module_css_default.globePane,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Globe, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: NetworkPanel_module_css_default.endpoints,
								children: ENDPOINTS.map((endpoint) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: NetworkPanel_module_css_default.endpoint,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: NetworkPanel_module_css_default.endpointName,
										children: endpoint.label
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: NetworkPanel_module_css_default.endpointCoord,
										children: [
											endpoint.lat.toFixed(2),
											"°N ",
											Math.abs(endpoint.lon).toFixed(2),
											"°",
											endpoint.lon < 0 ? "W" : "E"
										]
									})]
								}, endpoint.label))
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: NetworkPanel_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: NetworkPanel_module_css_default.title,
								children: "TRAFFIC"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: NetworkPanel_module_css_default.trafficHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: NetworkPanel_module_css_default.key,
										children: "UP"
									}),
									" ",
									network.upMbs.toFixed(2),
									" MB/s"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: NetworkPanel_module_css_default.key,
										children: "DOWN"
									}),
									" ",
									network.downMbs.toFixed(2),
									" MB/s"
								] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrafficChart, {
								up: network.upHistory,
								down: network.downHistory
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Poll cadence for the network overview. */
		const NETWORK_POLL_INTERVAL_MS = 2e3;
		/** Traffic history window (samples). */
		const TRAFFIC_WINDOW = 30;
		var NetworkSource = class {
			value = {
				ok: false,
				network: {
					interfaceName: "—",
					state: "—",
					ip: null,
					pingMs: null,
					rxBytes: 0,
					txBytes: 0
				},
				upHistory: [],
				downHistory: [],
				upMbs: 0,
				downMbs: 0
			};
			listeners = /* @__PURE__ */ new Set();
			getSnapshot() {
				return this.value;
			}
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			set(next) {
				this.value = next;
				for (const listener of this.listeners) listener();
			}
		};
		/** Polls the overview and derives traffic deltas + history. */
		var NetworkPoller = class {
			remote;
			intervalMs;
			source = new NetworkSource();
			timer;
			previous;
			upHistory = [];
			downHistory = [];
			constructor(remote, intervalMs = NETWORK_POLL_INTERVAL_MS) {
				this.remote = remote;
				this.intervalMs = intervalMs;
			}
			get networkSource() {
				return this.source;
			}
			start() {
				if (this.timer !== void 0) return;
				this.poll();
				this.timer = setInterval(() => {
					this.poll();
				}, this.intervalMs);
			}
			stop() {
				if (this.timer === void 0) return;
				clearInterval(this.timer);
				this.timer = void 0;
			}
			async poll() {
				const result = await this.remote.overview();
				if (!result.ok) return;
				const overview = result.value;
				const now = {
					timestamp: overview.timestamp,
					rx: overview.network.rxBytes,
					tx: overview.network.txBytes
				};
				let upMbs = 0;
				let downMbs = 0;
				if (this.previous !== void 0 && now.timestamp > this.previous.timestamp) {
					const dt = (now.timestamp - this.previous.timestamp) / 1e3;
					downMbs = Math.max(0, (now.rx - this.previous.rx) / 1048576 / dt);
					upMbs = Math.max(0, (now.tx - this.previous.tx) / 1048576 / dt);
				}
				this.previous = now;
				this.downHistory.push(downMbs);
				this.upHistory.push(upMbs);
				if (this.downHistory.length > TRAFFIC_WINDOW) this.downHistory.shift();
				if (this.upHistory.length > TRAFFIC_WINDOW) this.upHistory.shift();
				this.source.set({
					ok: true,
					network: overview.network,
					upHistory: [...this.upHistory],
					downHistory: [...this.downHistory],
					upMbs,
					downMbs
				});
			}
		};
		/** Required services: the slot registry and the mounted systemMetrics namespace (mounted by the system panel). */
		const inject = ["slots", "remote.systemMetrics"];
		/**
		* Client plugin body: poll the network overview and register the right panel.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const poller = new NetworkPoller(ctx.get("remote.systemMetrics"));
			ctx.effect(() => {
				poller.start();
				return () => {
					poller.stop();
				};
			}, "ui-network-panel: poller");
			ctx.effect(() => ctx.slots.register({
				name: "shell.right",
				inject: () => ({ hooks: { network: poller.networkSource } })
			}, NetworkPanel), "ui-network-panel: right column registration");
		}
		//#endregion
		exports.NETWORK_POLL_INTERVAL_MS = NETWORK_POLL_INTERVAL_MS;
		exports.NetworkPoller = NetworkPoller;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
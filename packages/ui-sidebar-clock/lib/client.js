window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-sidebar-clock",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:/Users/daniel/workspace/dsh-edex-ui/packages/ui-sidebar-clock/src/client/Clock.module.css.mjs
		const css = ".ZbaGJq_clock{min-width:0;height:100%;font-family:var(--ds-font-family-code,\"SF Mono\", \"JetBrains Mono\", Consolas, Menlo, monospace);white-space:nowrap;flex:1;align-items:baseline;gap:8px;display:flex;overflow:hidden}.ZbaGJq_date{color:var(--dsw-alias-label-secondary,currentColor);font-size:11px}.ZbaGJq_time{letter-spacing:1px;color:var(--dsw-alias-label-primary,currentColor);font-size:15px}";
		const tagId = "@deepseek-ai/dsh-client-ui-sidebar-clock/Clock.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-sidebar-clock";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var Clock_module_css_default = {
			"time": "ZbaGJq_time",
			"clock": "ZbaGJq_clock",
			"date": "ZbaGJq_date"
		};
		//#endregion
		//#region src/client/Clock.tsx
		/**
		* The brand-row clock: current date + time, ticking every second. Uses the
		* theme alias tokens so it matches whichever palette is active (including the
		* terminal theme).
		*/
		/** The sidebar brand-row clock. */
		function Clock() {
			const [now, setNow] = (0, react.useState)(() => /* @__PURE__ */ new Date());
			(0, react.useEffect)(() => {
				const timer = setInterval(() => setNow(/* @__PURE__ */ new Date()), 1e3);
				return () => {
					clearInterval(timer);
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Clock_module_css_default.clock,
				"data-testid": "sidebar-clock",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Clock_module_css_default.date,
					children: now.toLocaleDateString(void 0, {
						month: "short",
						day: "numeric"
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Clock_module_css_default.time,
					children: now.toLocaleTimeString()
				})]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required service: the slot registry. */
		const inject = ["slots"];
		/**
		* Client plugin body: register the clock into the brand row.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.slots.register({
				name: "sidebar.brand",
				priority: -1
			}, Clock), "ui-sidebar-clock: brand row registration");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
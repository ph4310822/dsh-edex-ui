window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-crt-frame",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:/Users/daniel/workspace/dsh-edex-ui/packages/ui-crt-frame/src/client/CrtFrame.module.css.mjs
		const css = "._2j4SuG_frame{position:absolute;inset:0}._2j4SuG_barLeft,._2j4SuG_barRight{background:var(--dsw-alias-bg-layer-1,#000);border-color:var(--dsw-alias-border-l1,currentColor);width:10px;position:absolute;top:0;bottom:0}._2j4SuG_barLeft{border-right:1px solid var(--dsw-alias-border-l1,currentColor);left:0}._2j4SuG_barRight{border-left:1px solid var(--dsw-alias-border-l1,currentColor);right:0}._2j4SuG_barBottom{background:var(--dsw-alias-bg-layer-1,#000);border-top:1px solid var(--dsw-alias-border-l1,currentColor);height:10px;position:absolute;bottom:0;left:0;right:0}";
		const tagId = "@deepseek-ai/dsh-client-ui-crt-frame/CrtFrame.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-crt-frame";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var CrtFrame_module_css_default = {
			"frame": "_2j4SuG_frame",
			"barRight": "_2j4SuG_barRight",
			"barBottom": "_2j4SuG_barBottom",
			"barLeft": "_2j4SuG_barLeft"
		};
		//#endregion
		//#region src/client/CrtFrame.tsx
		/**
		* The CRT bezel: left/right/bottom bars framing the whole UI. Pure
		* decoration — pointer-events none everywhere (the overlay container makes
		* children interactive by default, so the root pins it back off inline).
		*/
		/** The bezel overlay. */
		function CrtFrame() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CrtFrame_module_css_default.frame,
				"data-testid": "crt-frame",
				style: { pointerEvents: "none" },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: CrtFrame_module_css_default.barLeft }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: CrtFrame_module_css_default.barRight }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: CrtFrame_module_css_default.barBottom })
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required service: the slot registry. */
		const inject = ["slots"];
		/**
		* Client plugin body: register the bezel into the overlay layer.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.slots.register({
				name: "shell.overlay",
				id: "crt-frame",
				order: 0
			}, CrtFrame), "ui-crt-frame: overlay registration");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
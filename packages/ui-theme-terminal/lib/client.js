window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-theme-terminal",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/** `theme-terminal` namespace dictionaries (the Appearance row label). */
		/** Dictionary namespace owned by this plugin. */
		const NS = "theme-terminal";
		/** Simplified Chinese dictionary. */
		const zh = { "appearance.terminal": "终端" };
		/** English dictionary. */
		const en = { "appearance.terminal": "Terminal" };
		//#endregion
		//#region \0dsh-css:/Users/daniel/workspace/dsh-edex-ui/packages/ui-theme-terminal/src/client/TerminalThemeRow.module.css.mjs
		const css = ".T-vceq_row{justify-content:space-between;align-items:center;gap:12px;padding:8px 0;display:flex}.T-vceq_label{color:var(--dsw-alias-label-primary,inherit);font-size:13px}.T-vceq_toggle{border:1px solid var(--dsw-alias-border-l1,currentColor);color:var(--dsw-alias-label-secondary,currentColor);cursor:pointer;background:0 0;padding:2px 8px;font-family:monospace;font-size:16px;line-height:1}.T-vceq_toggle:hover,.T-vceq_toggle[data-active]{color:var(--dsw-alias-brand-primary,currentColor);border-color:var(--dsw-alias-brand-primary,currentColor)}";
		const tagId = "@deepseek-ai/dsh-client-ui-theme-terminal/TerminalThemeRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-theme-terminal";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var TerminalThemeRow_module_css_default = {
			"toggle": "T-vceq_toggle",
			"label": "T-vceq_label",
			"row": "T-vceq_row"
		};
		//#endregion
		//#region src/client/TerminalThemeRow.tsx
		/** The Appearance row: label + toggle. */
		function TerminalThemeRow({ useTerminalActive, setTerminal, t }) {
			const active = useTerminalActive((s) => s);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TerminalThemeRow_module_css_default.row,
				"data-testid": "appearance-terminal",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: TerminalThemeRow_module_css_default.label,
					children: t("appearance.terminal")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: TerminalThemeRow_module_css_default.toggle,
					"data-active": active ? "" : void 0,
					"aria-pressed": active,
					onClick: setTerminal,
					children: active ? "▣" : "▢"
				})]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Theme id this plugin registers (the setTheme argument). */
		const THEME_ID = "terminal";
		/**
		* CRT palette as alias-token overrides. The presenter writes these as inline
		* CSS variables over the dark base palette, so the whole default UI (and any
		* widget registered into its slots) is recolored.
		*/
		const TOKENS = {
			"--dsw-alias-bg-base": "#000a00",
			"--dsw-alias-bg-layer-1": "#02120a",
			"--dsw-alias-bg-layer-2": "#031d10",
			"--dsw-alias-bg-overlay": "#000a00",
			"--dsw-alias-border-l1": "#1d7a3f",
			"--dsw-alias-border-l2": "#2ea854",
			"--dsw-alias-brand-primary": "#35e06a",
			"--dsw-alias-label-primary": "#35e06a",
			"--dsw-alias-label-secondary": "#2ea854",
			"--dsw-alias-state-error-primary": "#e05a5a",
			"--dsw-alias-state-success-primary": "#35e06a",
			"--dsw-alias-state-warn-primary": "#e0c05a",
			"--dsw-specific-sidebar-fill": "#001408"
		};
		/** Required services: slot registry for the Appearance row, the theme service, and locale. */
		const inject = [
			"slots",
			"theme",
			"locale"
		];
		/**
		* Client plugin body: register the terminal theme and the Appearance row that
		* selects it.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-theme-terminal: dictionaries");
			const disposeTheme = ctx.theme.register({
				id: THEME_ID,
				colorScheme: "dark",
				tokens: TOKENS
			});
			ctx.effect(() => () => void disposeTheme(), "ui-theme-terminal: theme registration");
			const terminalActiveSource = {
				getSnapshot: () => ctx.theme.getTheme().active.id === THEME_ID,
				subscribe: (listener) => ctx.on("theme/change", () => listener())
			};
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "appearance-terminal",
				order: 11,
				locale: NS,
				inject: () => ({
					setTerminal: () => {
						ctx.theme.setTheme(THEME_ID);
					},
					hooks: { terminalActive: terminalActiveSource }
				})
			}, TerminalThemeRow));
		}
		//#endregion
		exports.THEME_ID = THEME_ID;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
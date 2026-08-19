window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-files-browser",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:/Users/daniel/workspace/dsh-edex-ui/packages/ui-files-browser/src/client/FilesBrowser.module.css.mjs
		const css = ".l5963G_panel{background:var(--dsw-alias-bg-base,#000);height:100%;font-family:var(--ds-font-family-code,\"SF Mono\", \"JetBrains Mono\", Consolas, Menlo, monospace);color:var(--dsw-alias-label-primary,currentColor);flex-direction:column;font-size:11px;line-height:1.5;display:flex;overflow:hidden}.l5963G_pathRow{border-bottom:1px solid var(--dsw-alias-border-l1,currentColor);align-items:center;gap:8px;padding:6px 10px;display:flex}.l5963G_pathKey{color:var(--dsw-alias-label-secondary,currentColor);flex:none}.l5963G_path{white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;overflow:hidden}.l5963G_upButton{border:1px solid var(--dsw-alias-border-l1,currentColor);color:var(--dsw-alias-label-secondary,currentColor);cursor:pointer;background:0 0;flex:none;padding:2px 6px;font-family:inherit;font-size:12px;line-height:1}.l5963G_upButton:hover{color:var(--dsw-alias-label-primary,currentColor);border-color:var(--dsw-alias-label-primary,currentColor)}.l5963G_grid{flex:1;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));align-content:start;gap:4px;min-height:0;padding:8px;display:grid;overflow-y:auto}.l5963G_cell{color:var(--dsw-alias-label-primary,currentColor);cursor:pointer;background:0 0;border:1px solid #0000;flex-direction:column;align-items:center;gap:4px;padding:6px 2px;font-family:inherit;display:flex;overflow:hidden}.l5963G_cell:hover{border-color:var(--dsw-alias-border-l1,currentColor);background:#7f7f7f14}.l5963G_icon{color:var(--dsw-alias-label-secondary,currentColor);font-size:20px}.l5963G_name{text-align:center;white-space:nowrap;text-overflow:ellipsis;width:100%;font-size:10px;overflow:hidden}.l5963G_hint,.l5963G_error{color:var(--dsw-alias-label-secondary,currentColor);grid-column:1/-1;padding:8px}.l5963G_error{color:var(--dsw-alias-state-error-primary,currentColor)}.l5963G_storageRow{border-top:1px solid var(--dsw-alias-border-l1,currentColor);align-items:center;gap:10px;padding:6px 10px;display:flex}.l5963G_storageText{color:var(--dsw-alias-label-secondary,currentColor);white-space:nowrap;text-overflow:ellipsis;flex:none;overflow:hidden}.l5963G_storageBar{background:var(--dsw-alias-border-l1,currentColor);opacity:.35;flex:1;height:10px}.l5963G_storageFill{background:var(--dsw-alias-brand-primary,currentColor);height:100%}";
		const tagId = "@deepseek-ai/dsh-client-ui-files-browser/FilesBrowser.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-files-browser";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var FilesBrowser_module_css_default = {
			"upButton": "l5963G_upButton",
			"icon": "l5963G_icon",
			"name": "l5963G_name",
			"error": "l5963G_error",
			"storageText": "l5963G_storageText",
			"storageBar": "l5963G_storageBar",
			"storageRow": "l5963G_storageRow",
			"panel": "l5963G_panel",
			"cell": "l5963G_cell",
			"pathKey": "l5963G_pathKey",
			"pathRow": "l5963G_pathRow",
			"storageFill": "l5963G_storageFill",
			"hint": "l5963G_hint",
			"path": "l5963G_path",
			"grid": "l5963G_grid"
		};
		//#endregion
		//#region src/client/FilesBrowser.tsx
		/**
		* Bottom-left filesystem browser: current path header, icon grid of entries,
		* and the storage usage bar.
		*/
		/** Icon glyph per entry kind. */
		function glyph(isDirectory) {
			return isDirectory ? "▣" : "▤";
		}
		/** Grid cell for one entry. */
		function EntryCell({ name, isDirectory, onOpen }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: FilesBrowser_module_css_default.cell,
				onClick: onOpen,
				"data-testid": "fs-entry",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: FilesBrowser_module_css_default.icon,
					children: glyph(isDirectory)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: FilesBrowser_module_css_default.name,
					children: name
				})]
			});
		}
		function FilesBrowser({ useFiles, refresh, navigate }) {
			const files = useFiles((s) => s);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			const storagePct = files.storage.usedPct;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: FilesBrowser_module_css_default.panel,
				"data-testid": "files-browser",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: FilesBrowser_module_css_default.pathRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FilesBrowser_module_css_default.pathKey,
								children: "DIR"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FilesBrowser_module_css_default.path,
								title: files.path,
								children: files.path === "" ? "—" : files.path
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: FilesBrowser_module_css_default.upButton,
								onClick: () => {
									navigate("..");
								},
								"aria-label": "Up",
								children: "↑"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: FilesBrowser_module_css_default.upButton,
								onClick: refresh,
								"aria-label": "Refresh",
								children: "⟳"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: FilesBrowser_module_css_default.grid,
						children: [
							files.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: FilesBrowser_module_css_default.error,
								children: files.error
							}),
							files.error === null && files.phase === "loading" && files.entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: FilesBrowser_module_css_default.hint,
								children: "loading…"
							}),
							files.entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EntryCell, {
								name: entry.name,
								isDirectory: entry.isDirectory,
								onOpen: () => {
									if (entry.isDirectory) navigate(entry.name);
								}
							}, entry.name))
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: FilesBrowser_module_css_default.storageRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: FilesBrowser_module_css_default.storageText,
							children: [
								"MOUNT ",
								files.storage.path === "" ? "—" : files.storage.path,
								" used ",
								storagePct,
								"%"
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: FilesBrowser_module_css_default.storageBar,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: FilesBrowser_module_css_default.storageFill,
								style: { width: `${Math.min(100, storagePct)}%` }
							})
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		var FilesSource = class {
			value = {
				path: "",
				entries: [],
				error: null,
				phase: "loading",
				storage: {
					path: "",
					totalBytes: 0,
					usedBytes: 0,
					usedPct: 0
				}
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
		/** Join a child name onto a directory path. */
		function joinPath(path, name) {
			if (path === "/" || path.endsWith("/")) return `${path}${name}`;
			return `${path}/${name}`;
		}
		/** The parent of a directory path ('/' stays '/'). */
		function parentPath(path) {
			if (path === "/" || path === "") return "/";
			const trimmed = path.replace(/\/+$/, "");
			const index = trimmed.lastIndexOf("/");
			if (index <= 0) return "/";
			return trimmed.slice(0, index);
		}
		/** Lists directories and tracks the storage indicator. */
		var FilesController = class {
			remote;
			source = new FilesSource();
			currentPath;
			constructor(remote) {
				this.remote = remote;
			}
			get filesSource() {
				return this.source;
			}
			/** Fetch storage + list the current (or first) directory. */
			async refresh() {
				const overview = await this.remote.overview();
				if (overview.ok && this.currentPath === void 0) this.currentPath = overview.value.storage.path || "/";
				await this.list(this.currentPath ?? "/");
			}
			/** List one directory and remember it as current. */
			async list(path) {
				this.currentPath = path;
				const overview = await this.remote.overview();
				const listing = await this.remote.listDirectory(path);
				this.source.set({
					path,
					entries: listing.ok ? listing.value.entries : [],
					storage: overview.ok ? overview.value.storage : this.source.getSnapshot().storage,
					error: listing.ok ? listing.value.error : listing.error.message,
					phase: "ready"
				});
			}
			/** Navigate into a directory entry (or up for '..'). */
			navigate(name) {
				this.list(name === ".." ? parentPath(this.currentPath ?? "/") : joinPath(this.currentPath ?? "/", name));
			}
		};
		/** Required services: the slot registry and the mounted systemMetrics namespace. */
		const inject = ["slots", "remote.systemMetrics"];
		/**
		* Client plugin body: register the filesystem browser into the bottom-left
		* cell.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const controller = new FilesController(ctx.get("remote.systemMetrics"));
			ctx.effect(() => ctx.slots.register({
				name: "shell.bottom.left",
				inject: () => ({
					refresh: () => {
						controller.refresh();
					},
					navigate: (name) => {
						controller.navigate(name);
					},
					hooks: { files: controller.filesSource }
				})
			}, FilesBrowser), "ui-files-browser: bottom-left registration");
		}
		//#endregion
		exports.FilesController = FilesController;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
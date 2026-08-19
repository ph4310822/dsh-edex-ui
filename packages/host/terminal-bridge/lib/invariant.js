//#region lib/types/invariant.js
/** Package-owned invariant companion. @module @deepseek-ai/dsh-host-terminal-bridge/invariant */
const PACKAGE_NAME = "@deepseek-ai/dsh-host-terminal-bridge";
/** Cordis companion plugin name. */
const name = "host-terminal-bridge-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: every operation delegates to the terminal seam's own
* ownership enforcement (exact-Agent `expectOwned` guards); the bridge adds no
* mutable cross-plugin state beyond per-session read cursors whose lifecycle
* the bridge's own behavior specs pin.
*/
const install = () => {};
/** Register this package's invariant companion. */
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };

/** Package-owned invariant companion. @module @danielng23/dsh-host-system-metrics/invariant */
const PACKAGE_NAME = '@danielng23/dsh-host-system-metrics';
/** Cordis companion plugin name. */
export const name = 'host-system-metrics-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/** No runtime invariant: every snapshot is projected directly from `node:os` at call time. */
const install = () => { };
/** Register this package's invariant companion. */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */

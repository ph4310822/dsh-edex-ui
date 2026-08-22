/**
 * Generator-time type shim for the Typert protocol surface this repo's host
 * packages consume. Only the members imported by this repo's sources are
 * declared — enough for the generator's identity check (the declaration of
 * `Remote`/`TypertRemoteService` must live inside a registered workspace
 * package) and for the analysis program to typecheck the service classes.
 * This file never ships and is never imported at runtime or by the normal
 * build: tsconfig.host.json's `paths` routes `@deepseek-ai/dsh-typert-protocol`
 * here only while the generator runs.
 */

/** Remote RPC method decorator. The generator validates the literal name. */
export declare function Remote(name?: string): any

/** Remote RPC method decorator. The generator validates the literal name. */
export declare function RemoteScope(name?: string): any

/** Base class for Remote services; the generator validates super(ctx, key). */
export declare class TypertRemoteService {
  constructor(ctx: unknown, serviceKey: string)
}

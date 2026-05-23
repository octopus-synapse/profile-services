/**
 * Ownership lookup registry (P0-004).
 *
 * Each BC that owns a user-scoped entity registers a `(id) => userId | null`
 * lookup keyed by the entity name (`resume`, `job`, `post`, ...). The
 * `OwnershipGuard` pipeline stage consults the registry to verify the
 * caller owns the entity referenced in the request param BEFORE the
 * handler runs.
 *
 * Composition root wires per-BC lookups in `elysia-bootstrap.ts`. The
 * registry is mutable during boot (each BC's composition adds its
 * entry) and frozen-by-convention afterwards — call `register` only
 * during composition.
 *
 * The `lookupFn` returns:
 *   - `userId: string`  — the entity exists and is owned by that user
 *   - `null`            — the entity does NOT exist (the guard maps
 *                         this to `OwnershipResourceMissingException`,
 *                         a 403 not 404 to avoid leaking entity
 *                         existence to callers that aren't the owner)
 */

export type OwnershipLookupFn = (id: string) => Promise<string | null>;

export class OwnershipRegistry {
  private readonly lookups = new Map<string, OwnershipLookupFn>();

  register(entity: string, fn: OwnershipLookupFn): void {
    if (this.lookups.has(entity)) {
      throw new Error(`OwnershipRegistry: duplicate registration for "${entity}"`);
    }
    this.lookups.set(entity, fn);
  }

  resolve(entity: string): OwnershipLookupFn | undefined {
    return this.lookups.get(entity);
  }

  has(entity: string): boolean {
    return this.lookups.has(entity);
  }

  /** Used by static analysis: the list of registered entities. */
  list(): readonly string[] {
    return [...this.lookups.keys()];
  }
}

/**
 * Pure DAG logic for feature flags.
 * No I/O, no NestJS — fully unit-testable in isolation.
 */

import type { FeatureFlagKey, FlagDefinition, FlagImpactTree, FlagRecord } from './types';

export class FlagGraphCycleError extends Error {
  constructor(public readonly cycle: FeatureFlagKey[]) {
    super(`Feature flag dependency cycle: ${cycle.join(' -> ')}`);
    this.name = 'FlagGraphCycleError';
  }
}

export class FlagGraphMissingDependencyError extends Error {
  constructor(
    public readonly flag: FeatureFlagKey,
    public readonly missing: FeatureFlagKey,
  ) {
    super(`Feature flag "${flag}" depends on unknown flag "${missing}"`);
    this.name = 'FlagGraphMissingDependencyError';
  }
}

export class FlagGraphDuplicateKeyError extends Error {
  constructor(public readonly key: FeatureFlagKey) {
    super(`Duplicate feature flag key in registry: "${key}"`);
    this.name = 'FlagGraphDuplicateKeyError';
  }
}

/**
 * Validate registry invariants: unique keys, all dependsOn exist, no cycles.
 * Throws on first violation. Cycles surface the offending path.
 */
export function validateRegistry(defs: readonly FlagDefinition[]): void {
  const seen = new Set<FeatureFlagKey>();
  for (const def of defs) {
    if (seen.has(def.key)) throw new FlagGraphDuplicateKeyError(def.key);
    seen.add(def.key);
  }

  const byKey = new Map(defs.map((d) => [d.key, d]));
  for (const def of defs) {
    for (const dep of def.dependsOn) {
      if (!byKey.has(dep)) throw new FlagGraphMissingDependencyError(def.key, dep);
    }
  }

  detectCycle(defs);
}

/**
 * DFS-based cycle detection. On a back edge we walk the stack to rebuild the
 * cycle path so the error message is actionable.
 */
function detectCycle(defs: readonly FlagDefinition[]): void {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<FeatureFlagKey, number>();
  const parent = new Map<FeatureFlagKey, FeatureFlagKey | null>();
  const deps = new Map(defs.map((d) => [d.key, d.dependsOn]));

  for (const def of defs) color.set(def.key, WHITE);

  for (const def of defs) {
    if (color.get(def.key) !== WHITE) continue;
    const stack: FeatureFlagKey[] = [def.key];
    parent.set(def.key, null);
    color.set(def.key, GRAY);

    while (stack.length > 0) {
      const top = stack[stack.length - 1]!;
      const next = (deps.get(top) ?? []).find((d) => color.get(d) !== BLACK);

      if (next === undefined) {
        color.set(top, BLACK);
        stack.pop();
        continue;
      }

      if (color.get(next) === GRAY) {
        const cycle: FeatureFlagKey[] = [next];
        let node: FeatureFlagKey | null = top;
        while (node !== null && node !== next) {
          cycle.push(node);
          node = parent.get(node) ?? null;
        }
        cycle.push(next);
        throw new FlagGraphCycleError(cycle.reverse());
      }

      color.set(next, GRAY);
      parent.set(next, top);
      stack.push(next);
    }
  }
}

/**
 * Build the reverse edge map: for each flag, who depends on it (dependents).
 */
export function buildDependentsMap(
  flags: readonly FlagRecord[],
): Map<FeatureFlagKey, FeatureFlagKey[]> {
  const dependents = new Map<FeatureFlagKey, FeatureFlagKey[]>();
  for (const f of flags) dependents.set(f.key, []);
  for (const f of flags) {
    for (const dep of f.dependsOn) {
      const list = dependents.get(dep);
      if (list) list.push(f.key);
    }
  }
  return dependents;
}

/**
 * Transitive descendants: all flags that would become effectively OFF if `root` is OFF.
 * Returns as a tree for UI impact preview; order is deterministic (BFS).
 */
export function buildImpactTree(
  flags: readonly FlagRecord[],
  root: FeatureFlagKey,
): FlagImpactTree {
  const dependents = buildDependentsMap(flags);
  const visited = new Set<FeatureFlagKey>();

  const build = (key: FeatureFlagKey): FlagImpactTree => {
    visited.add(key);
    const children = (dependents.get(key) ?? [])
      .filter((c) => !visited.has(c))
      .map((c) => build(c));
    return { key, children };
  };

  return build(root);
}

/**
 * Effective-enabled resolution with memoization.
 * A flag is effectively ON iff:
 *   - its own `enabled` is true
 *   - every dependency is effectively ON
 *   - `enabledForRoles` is empty OR the caller has at least one listed role
 */
export function evaluateFlags(
  flags: readonly FlagRecord[],
  userRoles: readonly string[],
): Record<FeatureFlagKey, boolean> {
  const byKey = new Map(flags.map((f) => [f.key, f]));
  const memo = new Map<FeatureFlagKey, boolean>();
  const userRoleSet = new Set(userRoles);

  const evaluate = (key: FeatureFlagKey, stack: Set<FeatureFlagKey>): boolean => {
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    if (stack.has(key)) return false;

    const flag = byKey.get(key);
    if (!flag) return false;

    stack.add(key);
    const roleAllowed =
      flag.enabledForRoles.length === 0 || flag.enabledForRoles.some((r) => userRoleSet.has(r));
    const depsOk = flag.dependsOn.every((d) => evaluate(d, stack));
    stack.delete(key);

    const result = flag.enabled && roleAllowed && depsOk;
    memo.set(key, result);
    return result;
  };

  const out: Record<FeatureFlagKey, boolean> = {};
  for (const flag of flags) out[flag.key] = evaluate(flag.key, new Set());
  return out;
}

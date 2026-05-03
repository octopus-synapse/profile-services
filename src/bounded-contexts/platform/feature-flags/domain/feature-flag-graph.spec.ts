import { describe, expect, it } from 'bun:test';
import {
  buildImpactTree,
  evaluateFlags,
  FlagGraphCycleError,
  FlagGraphDuplicateKeyError,
  FlagGraphMissingDependencyError,
  validateRegistry,
} from './feature-flag-graph.service';
import type { FlagDefinition, FlagRecord } from './types';

const def = (key: string, dependsOn: string[] = []): FlagDefinition => ({
  key,
  name: key,
  dependsOn,
});

const rec = (
  key: string,
  enabled: boolean,
  dependsOn: string[] = [],
  enabledForRoles: string[] = [],
): FlagRecord => ({
  key,
  name: key,
  description: null,
  enabled,
  enabledForRoles,
  deprecated: false,
  dependsOn,
});

describe('validateRegistry', () => {
  it('accepts a valid DAG', () => {
    expect(() => validateRegistry([def('a'), def('b', ['a']), def('c', ['a', 'b'])])).not.toThrow();
  });

  it('rejects duplicate keys', () => {
    expect(() => validateRegistry([def('a'), def('a')])).toThrow(FlagGraphDuplicateKeyError);
  });

  it('rejects missing dependencies', () => {
    expect(() => validateRegistry([def('a', ['ghost'])])).toThrow(FlagGraphMissingDependencyError);
  });

  it('rejects self-cycles', () => {
    expect(() => validateRegistry([def('a', ['a'])])).toThrow(FlagGraphCycleError);
  });

  it('rejects multi-node cycles', () => {
    expect(() => validateRegistry([def('a', ['c']), def('b', ['a']), def('c', ['b'])])).toThrow(
      FlagGraphCycleError,
    );
  });
});

describe('evaluateFlags', () => {
  it('evaluates a single flag with no deps', () => {
    expect(evaluateFlags([rec('a', true)], [])).toEqual({ a: true });
    expect(evaluateFlags([rec('a', false)], [])).toEqual({ a: false });
  });

  it('cascades OFF from parent to child', () => {
    const result = evaluateFlags([rec('a', false), rec('b', true, ['a'])], []);
    expect(result).toEqual({ a: false, b: false });
  });

  it('requires all ancestors ON', () => {
    const result = evaluateFlags(
      [rec('a', true), rec('b', true, ['a']), rec('c', true, ['b'])],
      [],
    );
    expect(result).toEqual({ a: true, b: true, c: true });
  });

  it('respects role restriction with empty roles', () => {
    const flags = [rec('a', true, [], ['beta'])];
    expect(evaluateFlags(flags, [])).toEqual({ a: false });
    expect(evaluateFlags(flags, ['beta'])).toEqual({ a: true });
  });

  it('empty enabledForRoles means any role', () => {
    const flags = [rec('a', true, [], [])];
    expect(evaluateFlags(flags, [])).toEqual({ a: true });
  });

  it('role restriction on ancestor cascades', () => {
    const flags = [rec('a', true, [], ['beta']), rec('b', true, ['a'])];
    expect(evaluateFlags(flags, ['other'])).toEqual({ a: false, b: false });
    expect(evaluateFlags(flags, ['beta'])).toEqual({ a: true, b: true });
  });
});

describe('buildImpactTree', () => {
  it('returns the transitive subtree of dependents', () => {
    const flags = [
      rec('a', true),
      rec('b', true, ['a']),
      rec('c', true, ['b']),
      rec('d', true, ['a']),
      rec('e', true), // unrelated
    ];
    const tree = buildImpactTree(flags, 'a');
    expect(tree.key).toBe('a');
    const childKeys = tree.children.map((c) => c.key).sort();
    expect(childKeys).toEqual(['b', 'd']);
    const bChildren = tree.children.find((c) => c.key === 'b')?.children ?? [];
    expect(bChildren.map((c) => c.key)).toEqual(['c']);
  });

  it('returns just the root when nothing depends on it', () => {
    const tree = buildImpactTree([rec('a', true)], 'a');
    expect(tree).toEqual({ key: 'a', children: [] });
  });
});

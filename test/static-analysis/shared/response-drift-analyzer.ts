import type { ZodSchema } from 'zod';

export type Drift =
  | { kind: 'extra-field'; path: readonly string[] }
  | { kind: 'missing-field'; path: readonly string[]; expected: string }
  | {
      kind: 'type-mismatch';
      path: readonly string[];
      expected: string;
      actual: string;
    }
  | { kind: 'should-be-nullable'; path: readonly string[] }
  | { kind: 'should-be-optional'; path: readonly string[] };

interface ZodInternals {
  readonly _def?: {
    readonly typeName?: string;
    readonly shape?: () => Record<string, ZodSchema<unknown>>;
    readonly innerType?: ZodSchema<unknown>;
    readonly schema?: ZodSchema<unknown>;
    readonly type?: ZodSchema<unknown>;
    readonly options?: readonly ZodSchema<unknown>[];
    readonly value?: unknown;
    readonly values?: readonly unknown[] | Record<string, unknown>;
  };
}

function getDef(schema: ZodSchema<unknown>): ZodInternals['_def'] {
  return (schema as ZodInternals)._def;
}

function getTypeName(schema: ZodSchema<unknown>): string | undefined {
  return getDef(schema)?.typeName;
}

function isNullable(schema: ZodSchema<unknown>): boolean {
  const def = getDef(schema);
  if (!def) return false;
  if (def.typeName === 'ZodNullable' || def.typeName === 'ZodNull') return true;
  if (def.typeName === 'ZodOptional' || def.typeName === 'ZodDefault') {
    return def.innerType ? isNullable(def.innerType) : false;
  }
  if (def.typeName === 'ZodEffects' || def.typeName === 'ZodPipeline') {
    return def.schema ? isNullable(def.schema) : false;
  }
  if (def.typeName === 'ZodUnion' && def.options) {
    return def.options.some((o) => isNullable(o));
  }
  return false;
}

function isOptional(schema: ZodSchema<unknown>): boolean {
  const def = getDef(schema);
  if (!def) return false;
  if (def.typeName === 'ZodOptional' || def.typeName === 'ZodDefault') return true;
  if (
    def.typeName === 'ZodNullable' ||
    def.typeName === 'ZodEffects' ||
    def.typeName === 'ZodPipeline'
  ) {
    const inner = def.innerType ?? def.schema;
    return inner ? isOptional(inner) : false;
  }
  return false;
}

function unwrap(schema: ZodSchema<unknown>): ZodSchema<unknown> {
  const def = getDef(schema);
  if (!def) return schema;
  const wrapInner = [
    'ZodOptional',
    'ZodNullable',
    'ZodDefault',
    'ZodCatch',
    'ZodReadonly',
    'ZodBranded',
  ];
  const wrapSchema = ['ZodEffects', 'ZodPipeline'];
  if (wrapInner.includes(def.typeName ?? '') && def.innerType) return unwrap(def.innerType);
  if (wrapSchema.includes(def.typeName ?? '') && def.schema) return unwrap(def.schema);
  return schema;
}

function expectedTypeLabel(schema: ZodSchema<unknown>): string {
  return getTypeName(unwrap(schema)) ?? 'Unknown';
}

function actualTypeLabel(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesPrimitive(value: unknown, typeName: string): boolean {
  if (typeName === 'ZodString') return typeof value === 'string';
  if (typeName === 'ZodNumber') return typeof value === 'number';
  if (typeName === 'ZodBoolean') return typeof value === 'boolean';
  if (typeName === 'ZodBigInt') return typeof value === 'bigint';
  if (typeName === 'ZodAny' || typeName === 'ZodUnknown') return true;
  return false;
}

function matchesEnum(value: unknown, schema: ZodSchema<unknown>): boolean {
  const def = getDef(schema);
  if (!def) return false;
  if (def.typeName === 'ZodLiteral') return value === def.value;
  if (def.typeName === 'ZodEnum') {
    return Array.isArray(def.values) && def.values.includes(value);
  }
  if (def.typeName === 'ZodNativeEnum') {
    const values =
      def.values && typeof def.values === 'object'
        ? Object.values(def.values as Record<string, unknown>)
        : [];
    return values.includes(value);
  }
  return false;
}

export function analyzeDrift(schema: ZodSchema<unknown>, body: unknown): Drift[] {
  const drifts: Drift[] = [];
  walk(schema, body, [], drifts);
  return drifts;
}

function walk(
  schema: ZodSchema<unknown>,
  value: unknown,
  path: readonly string[],
  drifts: Drift[],
): void {
  if (value === null) {
    if (isNullable(schema)) return;
    drifts.push({ kind: 'should-be-nullable', path });
    return;
  }

  const inner = unwrap(schema);
  const typeName = getTypeName(inner) ?? 'Unknown';

  if (typeName === 'ZodObject') {
    if (typeof value !== 'object' || Array.isArray(value)) {
      drifts.push({
        kind: 'type-mismatch',
        path,
        expected: 'ZodObject',
        actual: actualTypeLabel(value),
      });
      return;
    }
    const shapeFn = (inner as ZodInternals)._def?.shape;
    const shape = typeof shapeFn === 'function' ? shapeFn() : {};
    const bodyObj = value as Record<string, unknown>;
    for (const [key, sub] of Object.entries(shape)) {
      if (key in bodyObj) {
        walk(sub, bodyObj[key], [...path, key], drifts);
      } else if (!isOptional(sub)) {
        drifts.push({
          kind: 'missing-field',
          path: [...path, key],
          expected: getTypeName(unwrap(sub)) ?? 'Unknown',
        });
      }
    }
    for (const key of Object.keys(bodyObj)) {
      if (!(key in shape)) {
        drifts.push({ kind: 'extra-field', path: [...path, key] });
      }
    }
    return;
  }

  if (typeName === 'ZodArray') {
    if (!Array.isArray(value)) {
      drifts.push({
        kind: 'type-mismatch',
        path,
        expected: 'ZodArray',
        actual: actualTypeLabel(value),
      });
      return;
    }
    const elementSchema = (inner as ZodInternals)._def?.type;
    if (!elementSchema) return;
    value.forEach((item, idx) => {
      walk(elementSchema, item, [...path, `[${idx}]`], drifts);
    });
    return;
  }

  if (typeName === 'ZodUnion' || typeName === 'ZodDiscriminatedUnion') {
    const options = (inner as ZodInternals)._def?.options ?? [];
    for (const option of options) {
      const trial: Drift[] = [];
      walk(option, value, path, trial);
      if (trial.length === 0) return;
    }
    drifts.push({
      kind: 'type-mismatch',
      path,
      expected: typeName,
      actual: actualTypeLabel(value),
    });
    return;
  }

  if (matchesEnum(value, inner)) return;
  if (typeName === 'ZodLiteral' || typeName === 'ZodEnum' || typeName === 'ZodNativeEnum') {
    drifts.push({ kind: 'type-mismatch', path, expected: typeName, actual: String(value) });
    return;
  }

  if (matchesPrimitive(value, typeName)) return;
  drifts.push({
    kind: 'type-mismatch',
    path,
    expected: expectedTypeLabel(inner),
    actual: actualTypeLabel(value),
  });
}

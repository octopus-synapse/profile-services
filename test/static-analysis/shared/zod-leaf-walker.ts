import type { ZodSchema } from 'zod';

export interface Offender {
  readonly schemaName: string;
  readonly path: readonly string[];
  readonly zodType: string;
}

export interface FindOffendersOptions {
  readonly schemaName: string;
  /**
   * Zod schemas (by reference) whose subtrees should be skipped entirely.
   * Use for recursive bounded patterns like `JsonValue`, `MenuNode`, etc.
   * — the walker would either descend forever or report each level as
   * a missing-example, neither of which is useful.
   */
  readonly exemptSchemas?: readonly ZodSchema<unknown>[];
  /**
   * Map of `field name → example value` used as a fallback when a leaf
   * lacks an explicit `.openapi({ example })`. The walker matches by
   * the LAST segment of the leaf's path (the field name), so nested
   * `authors[*].userId` reuses the same `userId → ...` mapping.
   * Pre-populated from `example-values.const.ts`.
   */
  readonly nameToExample?: ReadonlyMap<string, string>;
}

interface ZodInternals {
  readonly _def?: {
    readonly typeName?: string;
    readonly shape?: () => Record<string, ZodSchema<unknown>>;
    readonly innerType?: ZodSchema<unknown>;
    readonly schema?: ZodSchema<unknown>;
    readonly type?: ZodSchema<unknown>;
    readonly options?: readonly ZodSchema<unknown>[];
    readonly discriminator?: string;
    readonly value?: unknown;
    readonly unknownKeys?: 'strict' | 'strip' | 'passthrough';
    readonly openapi?: {
      readonly metadata?: {
        readonly example?: unknown;
        readonly examples?: unknown;
      };
    };
  };
}

const WRAPPER_VIA_INNER_TYPE = new Set([
  'ZodOptional',
  'ZodNullable',
  'ZodDefault',
  'ZodCatch',
  'ZodReadonly',
  'ZodBranded',
]);

const WRAPPER_VIA_SCHEMA = new Set(['ZodEffects', 'ZodPipeline']);

const IMPLICIT_EXAMPLE_TYPES = new Set(['ZodLiteral', 'ZodEnum', 'ZodNativeEnum']);

function unwrapWrapper(schema: ZodSchema<unknown>): ZodSchema<unknown> | undefined {
  const def = (schema as ZodInternals)._def;
  if (!def) return undefined;
  if (def.typeName && WRAPPER_VIA_INNER_TYPE.has(def.typeName)) return def.innerType;
  if (def.typeName && WRAPPER_VIA_SCHEMA.has(def.typeName)) return def.schema;
  return undefined;
}

function getTypeName(schema: ZodSchema<unknown>): string | undefined {
  return (schema as ZodInternals)._def?.typeName;
}

function getShape(schema: ZodSchema<unknown>): Record<string, ZodSchema<unknown>> | undefined {
  const shapeFn = (schema as ZodInternals)._def?.shape;
  return typeof shapeFn === 'function' ? shapeFn() : undefined;
}

export function findOffenders(
  schema: ZodSchema<unknown>,
  options: FindOffendersOptions,
): Offender[] {
  const offenders: Offender[] = [];
  const exempt = new Set<ZodSchema<unknown>>(options.exemptSchemas ?? []);
  const nameToExample = options.nameToExample ?? new Map<string, string>();
  walk(schema, [], offenders, options.schemaName, exempt, nameToExample);
  return offenders;
}

function hasExample(schema: ZodSchema<unknown>): boolean {
  const meta = (schema as ZodInternals)._def?.openapi?.metadata;
  return meta?.example !== undefined || meta?.examples !== undefined;
}

function walk(
  schema: ZodSchema<unknown>,
  path: readonly string[],
  offenders: Offender[],
  schemaName: string,
  exempt: ReadonlySet<ZodSchema<unknown>>,
  nameToExample: ReadonlyMap<string, string>,
): void {
  if (exempt.has(schema)) {
    return;
  }

  if (hasExample(schema)) {
    return;
  }

  const inner = unwrapWrapper(schema);
  if (inner) {
    walk(inner, path, offenders, schemaName, exempt, nameToExample);
    return;
  }

  const typeName = getTypeName(schema) ?? 'Unknown';
  const def = (schema as ZodInternals)._def;

  if (IMPLICIT_EXAMPLE_TYPES.has(typeName)) {
    return;
  }

  if (typeName === 'ZodObject') {
    if (def?.unknownKeys === 'passthrough') {
      emitOffender(offenders, schemaName, path, 'ZodObject', nameToExample);
      return;
    }
    const shape = getShape(schema);
    if (shape) {
      for (const [key, sub] of Object.entries(shape)) {
        walk(sub, [...path, key], offenders, schemaName, exempt, nameToExample);
      }
    }
    return;
  }

  if (typeName === 'ZodArray' && def?.type) {
    walk(def.type, [...path, '[*]'], offenders, schemaName, exempt, nameToExample);
    return;
  }

  if (typeName === 'ZodUnion' && def?.options) {
    for (const option of def.options) {
      walk(option, path, offenders, schemaName, exempt, nameToExample);
    }
    return;
  }

  if (typeName === 'ZodDiscriminatedUnion' && def?.options && def.discriminator) {
    for (const option of def.options) {
      const variantTag = readDiscriminatorValue(option, def.discriminator);
      walkVariantSkippingDiscriminator(
        option,
        [...path, `${def.discriminator}=${variantTag}`],
        def.discriminator,
        offenders,
        schemaName,
        exempt,
        nameToExample,
      );
    }
    return;
  }

  emitOffender(offenders, schemaName, path, typeName, nameToExample);
}

function emitOffender(
  offenders: Offender[],
  schemaName: string,
  path: readonly string[],
  zodType: string,
  nameToExample: ReadonlyMap<string, string>,
): void {
  const fieldName = path[path.length - 1];
  if (fieldName !== undefined && nameToExample.has(fieldName)) {
    return;
  }
  offenders.push({ schemaName, path, zodType });
}

function readDiscriminatorValue(variant: ZodSchema<unknown>, discriminator: string): string {
  const shape = getShape(variant);
  const discField = shape?.[discriminator];
  if (!discField) return '?';
  const def = (discField as ZodInternals)._def;
  if (def?.typeName === 'ZodLiteral' && def.value !== undefined) return String(def.value);
  return '?';
}

function walkVariantSkippingDiscriminator(
  variant: ZodSchema<unknown>,
  path: readonly string[],
  discriminator: string,
  offenders: Offender[],
  schemaName: string,
  exempt: ReadonlySet<ZodSchema<unknown>>,
  nameToExample: ReadonlyMap<string, string>,
): void {
  const shape = getShape(variant);
  if (!shape) return;
  for (const [key, sub] of Object.entries(shape)) {
    if (key === discriminator) continue;
    walk(sub, [...path, key], offenders, schemaName, exempt, nameToExample);
  }
}

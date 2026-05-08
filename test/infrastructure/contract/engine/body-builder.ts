import type { ZodSchema } from 'zod';

interface ZodOpenApiDef {
  _def?: {
    openapi?: { metadata?: { example?: unknown } };
    innerType?: ZodSchema<unknown>;
    schema?: ZodSchema<unknown>;
    typeName?: string;
  };
}

const WRAPPERS = [
  'ZodOptional',
  'ZodNullable',
  'ZodDefault',
  'ZodCatch',
  'ZodReadonly',
  'ZodBranded',
];

function findExample(schema: ZodSchema<unknown>): unknown | undefined {
  const def = (schema as ZodOpenApiDef)._def;
  if (!def) return undefined;
  if (def.openapi?.metadata?.example !== undefined) return def.openapi.metadata.example;
  if (WRAPPERS.includes(def.typeName ?? '') && def.innerType) return findExample(def.innerType);
  if ((def.typeName === 'ZodEffects' || def.typeName === 'ZodPipeline') && def.schema) {
    return findExample(def.schema);
  }
  return undefined;
}

export function extractBodyExample(bodySchema: ZodSchema<unknown> | undefined): unknown | null {
  if (!bodySchema) return null;
  const example = findExample(bodySchema);
  return example !== undefined ? example : null;
}

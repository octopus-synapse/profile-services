import { z } from 'zod';

export const SectionKindSchema = z.string().min(1);

export type SectionKind = z.infer<typeof SectionKindSchema>;

export const SemanticRoleSchema = z.string().min(1);

export type SemanticRole = z.infer<typeof SemanticRoleSchema>;

export const SectionFieldTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'date',
  'enum',
  'array',
  'object',
]);

export type SectionFieldType = z.infer<typeof SectionFieldTypeSchema>;

export interface SectionFieldDefinition {
  key?: string;
  type: SectionFieldType;
  required?: boolean;
  nullable?: boolean;
  semanticRole?: SemanticRole;
  enum?: string[];
  items?: SectionFieldDefinition;
  fields?: SectionFieldDefinition[];
  meta?: Record<string, unknown>;
}

export const SectionFieldDefinitionSchema: z.ZodType<SectionFieldDefinition> = z.lazy(() =>
  z.object({
    key: z.string().min(1).optional(),
    type: SectionFieldTypeSchema,
    required: z.boolean().optional(),
    nullable: z.boolean().optional(),
    semanticRole: SemanticRoleSchema.optional(),
    enum: z.array(z.string().min(1)).optional(),
    items: SectionFieldDefinitionSchema.optional(),
    fields: z.array(SectionFieldDefinitionSchema).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
);

export const SectionItemConstraintsSchema = z.object({
  allowsMultipleItems: z.boolean().optional(),
  minItems: z.number().int().min(0).optional(),
  maxItems: z.number().int().min(1).optional(),
});

export type SectionItemConstraints = z.infer<typeof SectionItemConstraintsSchema>;

export const SectionDefinitionSchema = z.object({
  schemaVersion: z.number().int().min(1).default(1),
  kind: SectionKindSchema,
  constraints: SectionItemConstraintsSchema.optional(),
  fields: z.array(SectionFieldDefinitionSchema),
});

export type SectionDefinition = z.infer<typeof SectionDefinitionSchema>;

export const SemanticFieldValueSchema = z.object({
  role: SemanticRoleSchema,
  value: z.unknown(),
});

export type SemanticFieldValue = z.infer<typeof SemanticFieldValueSchema>;

export const SemanticSectionItemSchema = z.object({
  sectionTypeKey: z.string().min(1),
  sectionTypeVersion: z.number().int().min(1),
  sectionKind: SectionKindSchema,
  values: z.array(SemanticFieldValueSchema),
});

export type SemanticSectionItem = z.infer<typeof SemanticSectionItemSchema>;

export const SemanticResumeSnapshotSchema = z.object({
  resumeId: z.string().min(1),
  items: z.array(SemanticSectionItemSchema),
});

export type SemanticResumeSnapshot = z.infer<typeof SemanticResumeSnapshotSchema>;

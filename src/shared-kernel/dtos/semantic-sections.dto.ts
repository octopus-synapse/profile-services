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

// ============================================================================
// ATS Scoring Configuration (DB-driven, not hardcoded)
// ============================================================================

export const AtsScoringConfigSchema = z.object({
  baseScore: z.number().int().min(0).max(100).default(30),
  fieldWeights: z.record(z.string(), z.number().min(0).max(100)).default({}),
});

export type AtsScoringConfig = z.infer<typeof AtsScoringConfigSchema>;

export const AtsConfigSchema = z.object({
  isMandatory: z.boolean().default(false),
  recommendedPosition: z.number().int().min(0).default(99),
  scoring: AtsScoringConfigSchema.default({}),
});

export type AtsConfig = z.infer<typeof AtsConfigSchema>;

// ============================================================================
// Export Mapping Configuration (DB-driven, not hardcoded)
// ============================================================================

export const ExportFieldMappingSchema = z.record(z.string(), z.string());

export type ExportFieldMapping = z.infer<typeof ExportFieldMappingSchema>;

export const ExportConfigSchema = z.object({
  jsonResume: z
    .object({
      sectionKey: z.string().optional(),
      fieldMapping: ExportFieldMappingSchema.default({}),
    })
    .optional(),
  dsl: z
    .object({
      sectionId: z.string(),
      astType: z.string(),
    })
    .optional(),
});

export type ExportConfig = z.infer<typeof ExportConfigSchema>;

// ============================================================================
// Section Definition (the single source of truth)
// ============================================================================

export const SectionDefinitionSchema = z.object({
  schemaVersion: z.number().int().min(1).default(1),
  kind: SectionKindSchema,
  constraints: SectionItemConstraintsSchema.optional(),
  fields: z.array(SectionFieldDefinitionSchema),
  ats: AtsConfigSchema.optional(),
  export: ExportConfigSchema.optional(),
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

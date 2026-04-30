import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Structured per-field validation. The frontend renders these as native
 * input attributes / runtime checks without any local Zod schema; the
 * backend remains the source of truth for what counts as a valid value.
 */
const FieldValidationSchema = z
  .object({
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(0).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    required: z.boolean().optional(),
    format: z.enum(['email', 'url', 'cpf', 'phone', 'cep', 'date']).optional(),
  })
  .optional();

const StepFieldSchema = z.object({
  key: z.string(),
  type: z.string(),
  label: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  widget: z.string().optional(),
  /** Server-driven validation rules. The frontend reads these at render time. */
  validation: FieldValidationSchema,
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  defaultValue: z.unknown().optional(),
  /** Optional DSL expression — when truthy, the field is rendered disabled. */
  disabledIf: z.string().optional(),
});

const StepMetaSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  required: z.boolean(),
  component: z.string(),
  icon: z.string().optional(),
  fields: z.array(StepFieldSchema).optional(),
  noDataLabel: z.string().optional(),
  placeholder: z.string().optional(),
  addLabel: z.string().optional(),
  multipleItems: z.boolean().optional(),
  sectionTypeKey: z.string().optional(),
});

const FieldMetaSchema = z.object({
  key: z.string(),
  type: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  validation: FieldValidationSchema,
  helpText: z.string().optional(),
  defaultValue: z.unknown().optional(),
  disabledIf: z.string().optional(),
});

export class FieldMetaDto extends createZodDto(FieldMetaSchema) {}
export class StepMetaDto extends createZodDto(StepMetaSchema) {}

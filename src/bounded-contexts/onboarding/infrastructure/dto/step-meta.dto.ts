import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const StepFieldSchema = z.object({
  key: z.string(),
  type: z.string(),
  label: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  widget: z.string().optional(),
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
});

export class FieldMetaDto extends createZodDto(FieldMetaSchema) {}
export class StepMetaDto extends createZodDto(StepMetaSchema) {}

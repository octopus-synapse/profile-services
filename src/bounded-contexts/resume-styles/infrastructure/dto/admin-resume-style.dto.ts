import { LayoutKind } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const LayoutKindEnum = z.nativeEnum(LayoutKind);

const CreateStyleRequestSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  typstTemplate: z.string().min(1),
  layoutKind: LayoutKindEnum,
  styleConfig: z.record(z.unknown()),
  sectionStyles: z.record(z.unknown()).optional(),
});

export class CreateStyleRequestDto extends createZodDto(CreateStyleRequestSchema) {}

const UpdateStyleRequestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  typstTemplate: z.string().min(1).optional(),
  layoutKind: LayoutKindEnum.optional(),
  styleConfig: z.record(z.unknown()).optional(),
  sectionStyles: z.record(z.unknown()).optional(),
});

export class UpdateStyleRequestDto extends createZodDto(UpdateStyleRequestSchema) {}

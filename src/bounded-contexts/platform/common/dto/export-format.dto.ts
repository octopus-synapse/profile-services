import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ExportFormatSchema = z.object({
  format: z.enum(['PDF', 'DOCX', 'JSON']),
});

const ExportFormatsDataSchema = z.object({
  formats: z.array(ExportFormatSchema),
});

export class ExportFormatResponseDto extends createZodDto(ExportFormatSchema) {}
export class ExportFormatsDataDto extends createZodDto(ExportFormatsDataSchema) {}

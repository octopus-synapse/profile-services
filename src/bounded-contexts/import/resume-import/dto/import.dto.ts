/**
 * Resume Import DTOs
 *
 * Data Transfer Objects for resume import API.
 * Swagger decorators document contracts, Zod ensures correctness.
 *
 * Kent Beck: "Make the interface obvious"
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Local type definitions to avoid Prisma coupling in DTOs
// Must stay in sync with prisma/schema/resume-import.prisma
export type ImportSource = 'LINKEDIN' | 'PDF' | 'DOCX' | 'JSON' | 'GITHUB';
export type ImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'MAPPING'
  | 'VALIDATING'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL';

// ============================================================================
// JSON Resume Zod Schemas (jsonresume.org standard)
// ============================================================================

const JsonResumeBasicsLocationSchema = z.object({
  city: z.string().optional(),
  countryCode: z.string().optional(),
  region: z.string().optional(),
});

const JsonResumeProfileSchema = z.object({
  network: z.string().optional(),
  url: z.string().url().optional(),
  username: z.string().optional(),
});

const JsonResumeBasicsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  label: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  url: z.string().url().optional(),
  summary: z.string().optional(),
  location: JsonResumeBasicsLocationSchema.optional(),
  profiles: z.array(JsonResumeProfileSchema).optional(),
});

const JsonResumeWorkSchema = z.object({
  name: z.string().optional(),
  position: z.string().optional(),
  url: z.string().url().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

const JsonResumeEducationSchema = z.object({
  institution: z.string().optional(),
  area: z.string().optional(),
  studyType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  score: z.string().optional(),
});

const JsonResumeSkillSchema = z.object({
  name: z.string().optional(),
  level: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

const JsonResumeLanguageSchema = z.object({
  language: z.string().optional(),
  fluency: z.string().optional(),
});

const JsonResumeCertificateSchema = z.object({
  name: z.string().optional(),
  date: z.string().optional(),
  issuer: z.string().optional(),
  url: z.string().url().optional(),
});

const JsonResumeProjectSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  keywords: z.array(z.string()).optional(),
});

const JsonResumeSchemaZod = z.object({
  basics: JsonResumeBasicsSchema,
  work: z.array(JsonResumeWorkSchema).optional(),
  education: z.array(JsonResumeEducationSchema).optional(),
  skills: z.array(JsonResumeSkillSchema).optional(),
  languages: z.array(JsonResumeLanguageSchema).optional(),
  certificates: z.array(JsonResumeCertificateSchema).optional(),
  projects: z.array(JsonResumeProjectSchema).optional(),
});

// ============================================================================
// JSON Resume DTOs (TypeScript classes for Swagger)
// ============================================================================

class JsonResumeBasicsLocationDto {
  @ApiPropertyOptional({ example: 'San Francisco' })
  city?: string;

  @ApiPropertyOptional({ example: 'US' })
  countryCode?: string;

  @ApiPropertyOptional({ example: 'California' })
  region?: string;
}

class JsonResumeProfileDto {
  @ApiPropertyOptional({ example: 'GitHub' })
  network?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe' })
  url?: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  username?: string;
}

class JsonResumeBasicsDto {
  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  label?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-123-4567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.com' })
  url?: string;

  @ApiPropertyOptional({ example: 'Experienced full-stack developer' })
  summary?: string;

  @ApiPropertyOptional({ type: JsonResumeBasicsLocationDto })
  location?: JsonResumeBasicsLocationDto;

  @ApiPropertyOptional({ type: [JsonResumeProfileDto] })
  profiles?: JsonResumeProfileDto[];
}

class JsonResumeWorkDto {
  @ApiPropertyOptional({ example: 'ACME Corp' })
  name?: string;

  @ApiPropertyOptional({ example: 'Senior Developer' })
  position?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  url?: string;

  @ApiPropertyOptional({ example: '2020-01-15' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2023-05-30' })
  endDate?: string;

  @ApiPropertyOptional({ example: 'Led development team' })
  summary?: string;

  @ApiPropertyOptional({
    example: ['Migrated to microservices', 'Reduced latency by 40%'],
  })
  highlights?: string[];
}

class JsonResumeEducationDto {
  @ApiPropertyOptional({ example: 'Stanford University' })
  institution?: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  area?: string;

  @ApiPropertyOptional({ example: 'Bachelor' })
  studyType?: string;

  @ApiPropertyOptional({ example: '2015-09-01' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2019-06-15' })
  endDate?: string;

  @ApiPropertyOptional({ example: '3.8' })
  score?: string;
}

class JsonResumeSkillDto {
  @ApiPropertyOptional({ example: 'TypeScript' })
  name?: string;

  @ApiPropertyOptional({ example: 'Advanced' })
  level?: string;

  @ApiPropertyOptional({ example: ['Node.js', 'React', 'NestJS'] })
  keywords?: string[];
}

class JsonResumeLanguageDto {
  @ApiPropertyOptional({ example: 'English' })
  language?: string;

  @ApiPropertyOptional({ example: 'Native' })
  fluency?: string;
}

class JsonResumeCertificateDto {
  @ApiPropertyOptional({ example: 'AWS Solutions Architect' })
  name?: string;

  @ApiPropertyOptional({ example: '2023-03-15' })
  date?: string;

  @ApiPropertyOptional({ example: 'Amazon Web Services' })
  issuer?: string;

  @ApiPropertyOptional({ example: 'https://aws.amazon.com/certification/' })
  url?: string;
}

class JsonResumeProjectDto {
  @ApiPropertyOptional({ example: 'E-commerce Platform' })
  name?: string;

  @ApiPropertyOptional({ example: 'Built scalable online store' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe/ecommerce' })
  url?: string;

  @ApiPropertyOptional({ example: ['TypeScript', 'React', 'PostgreSQL'] })
  keywords?: string[];
}

export class JsonResumeSchemaDto {
  @ApiProperty({ type: JsonResumeBasicsDto })
  basics!: JsonResumeBasicsDto;

  @ApiPropertyOptional({ type: [JsonResumeWorkDto] })
  work?: JsonResumeWorkDto[];

  @ApiPropertyOptional({ type: [JsonResumeEducationDto] })
  education?: JsonResumeEducationDto[];

  @ApiPropertyOptional({ type: [JsonResumeSkillDto] })
  skills?: JsonResumeSkillDto[];

  @ApiPropertyOptional({ type: [JsonResumeLanguageDto] })
  languages?: JsonResumeLanguageDto[];

  @ApiPropertyOptional({ type: [JsonResumeCertificateDto] })
  certificates?: JsonResumeCertificateDto[];

  @ApiPropertyOptional({ type: [JsonResumeProjectDto] })
  projects?: JsonResumeProjectDto[];
}

// ============================================================================
// Request DTOs with Zod validation
// ============================================================================

const ImportJsonSchema = z.object({
  data: JsonResumeSchemaZod,
});

export class ImportJsonDto extends createZodDto(ImportJsonSchema) {
  @ApiProperty({
    description: 'JSON Resume format data (jsonresume.org)',
    type: JsonResumeSchemaDto,
  })
  data!: JsonResumeSchemaDto;
}

// ============================================================================
// Response DTOs (no validation needed, output only)
// ============================================================================

export class ImportResultDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  importId!: string;

  @ApiProperty({
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  })
  status!: ImportStatus;

  @ApiPropertyOptional({ example: 'resume-uuid' })
  resumeId?: string;

  @ApiPropertyOptional({ example: ['Error message if failed'] })
  errors?: string[];
}

class ParsedPersonalInfoDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  name?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-123-4567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  location?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.com' })
  website?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  linkedin?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe' })
  github?: string;
}

class ParsedSectionDto {
  @ApiProperty({
    example: 'work_experience_v1',
    description: 'Section type key',
  })
  sectionTypeKey!: string;

  @ApiProperty({
    example: [{ company: 'ACME Corp', position: 'Senior Developer' }],
    description: 'Section items as generic content objects',
  })
  items!: Array<Record<string, unknown>>;
}

export class ParsedResumeDataDto {
  @ApiProperty({ type: ParsedPersonalInfoDto })
  personalInfo!: ParsedPersonalInfoDto;

  @ApiPropertyOptional({ example: 'Experienced full-stack developer' })
  summary?: string;

  @ApiProperty({
    type: [ParsedSectionDto],
    description: 'Generic sections with items',
  })
  sections!: ParsedSectionDto[];
}

export class ImportJobDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  id!: string;

  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiProperty({ enum: ['JSON', 'PDF', 'DOCX', 'LINKEDIN'] })
  source!: ImportSource;

  @ApiProperty({
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  })
  status!: ImportStatus;

  @ApiPropertyOptional({
    description: 'Raw import data (format depends on source)',
  })
  data?: unknown;

  @ApiPropertyOptional({ type: ParsedResumeDataDto })
  parsedData?: ParsedResumeDataDto;

  @ApiPropertyOptional({ example: 'resume-uuid' })
  resumeId?: string;

  @ApiPropertyOptional({ example: ['Error message if failed'] })
  errors?: string[];

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-15T10:30:15Z' })
  updatedAt?: string;
}

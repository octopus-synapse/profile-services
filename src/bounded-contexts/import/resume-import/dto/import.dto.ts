/**
 * Resume Import DTOs
 *
 * Data Transfer Objects for resume import API.
 * Swagger decorators document contracts, class-validator ensures correctness.
 *
 * Kent Beck: "Make the interface obvious"
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsString,
  IsOptional,
  ValidateNested,
  IsArray,
  IsUrl,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { ImportStatus, ImportSource } from '@prisma/client';

// ============================================================================
// JSON Resume DTOs (jsonresume.org standard)
// ============================================================================

class JsonResumeBasicsLocationDto {
  @ApiPropertyOptional({ example: 'San Francisco' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'California' })
  @IsOptional()
  @IsString()
  region?: string;
}

class JsonResumeProfileDto {
  @ApiPropertyOptional({ example: 'GitHub' })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  @IsOptional()
  @IsString()
  username?: string;
}

class JsonResumeBasicsDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-123-4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.com' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: 'Experienced full-stack developer' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ type: JsonResumeBasicsLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => JsonResumeBasicsLocationDto)
  location?: JsonResumeBasicsLocationDto;

  @ApiPropertyOptional({ type: [JsonResumeProfileDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonResumeProfileDto)
  profiles?: JsonResumeProfileDto[];
}

class JsonResumeWorkDto {
  @ApiPropertyOptional({ example: 'ACME Corp' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Senior Developer' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: '2020-01-15' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2023-05-30' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Led development team' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    example: ['Migrated to microservices', 'Reduced latency by 40%'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];
}

class JsonResumeEducationDto {
  @ApiPropertyOptional({ example: 'Stanford University' })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ example: 'Bachelor' })
  @IsOptional()
  @IsString()
  studyType?: string;

  @ApiPropertyOptional({ example: '2015-09-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2019-06-15' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: '3.8' })
  @IsOptional()
  @IsString()
  score?: string;
}

class JsonResumeSkillDto {
  @ApiPropertyOptional({ example: 'TypeScript' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Advanced' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ example: ['Node.js', 'React', 'NestJS'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

class JsonResumeLanguageDto {
  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'Native' })
  @IsOptional()
  @IsString()
  fluency?: string;
}

class JsonResumeCertificateDto {
  @ApiPropertyOptional({ example: 'AWS Solutions Architect' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '2023-03-15' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: 'Amazon Web Services' })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({ example: 'https://aws.amazon.com/certification/' })
  @IsOptional()
  @IsUrl()
  url?: string;
}

class JsonResumeProjectDto {
  @ApiPropertyOptional({ example: 'E-commerce Platform' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Built scalable online store' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe/ecommerce' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: ['TypeScript', 'React', 'PostgreSQL'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class JsonResumeSchemaDto {
  @ApiProperty({ type: JsonResumeBasicsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => JsonResumeBasicsDto)
  basics!: JsonResumeBasicsDto;

  @ApiPropertyOptional({ type: [JsonResumeWorkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonResumeWorkDto)
  work?: JsonResumeWorkDto[];

  @ApiPropertyOptional({ type: [JsonResumeEducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonResumeEducationDto)
  education?: JsonResumeEducationDto[];

  @ApiPropertyOptional({ type: [JsonResumeSkillDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonResumeSkillDto)
  skills?: JsonResumeSkillDto[];

  @ApiPropertyOptional({ type: [JsonResumeLanguageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonResumeLanguageDto)
  languages?: JsonResumeLanguageDto[];

  @ApiPropertyOptional({ type: [JsonResumeCertificateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonResumeCertificateDto)
  certificates?: JsonResumeCertificateDto[];

  @ApiPropertyOptional({ type: [JsonResumeProjectDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonResumeProjectDto)
  projects?: JsonResumeProjectDto[];
}

// ============================================================================
// Request DTOs
// ============================================================================

export class ImportJsonDto {
  @ApiProperty({
    description: 'JSON Resume format data (jsonresume.org)',
    type: JsonResumeSchemaDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => JsonResumeSchemaDto)
  data!: JsonResumeSchemaDto;
}

// ============================================================================
// Response DTOs
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

class ParsedExperienceDto {
  @ApiProperty({ example: 'Senior Developer' })
  title!: string;

  @ApiProperty({ example: 'ACME Corp' })
  company!: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  location?: string;

  @ApiProperty({ example: '2020-01-15' })
  startDate!: string;

  @ApiPropertyOptional({ example: '2023-05-30' })
  endDate?: string;

  @ApiPropertyOptional({ example: 'Led development team' })
  description?: string;

  @ApiPropertyOptional({
    example: ['Migrated to microservices', 'Reduced latency by 40%'],
  })
  highlights?: string[];
}

class ParsedEducationDto {
  @ApiProperty({ example: 'Bachelor of Computer Science' })
  degree!: string;

  @ApiProperty({ example: 'Stanford University' })
  institution!: string;

  @ApiPropertyOptional({ example: 'Stanford, CA' })
  location?: string;

  @ApiPropertyOptional({ example: '2015-09-01' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2019-06-15' })
  endDate?: string;

  @ApiPropertyOptional({ example: 'Focused on distributed systems' })
  description?: string;
}

class ParsedCertificationDto {
  @ApiProperty({ example: 'AWS Solutions Architect' })
  name!: string;

  @ApiPropertyOptional({ example: 'Amazon Web Services' })
  issuer?: string;

  @ApiPropertyOptional({ example: '2023-03-15' })
  date?: string;

  @ApiPropertyOptional({ example: 'https://aws.amazon.com/certification/' })
  url?: string;
}

class ParsedLanguageDto {
  @ApiProperty({ example: 'English' })
  name!: string;

  @ApiPropertyOptional({ example: 'Native' })
  level?: string;
}

class ParsedProjectDto {
  @ApiProperty({ example: 'E-commerce Platform' })
  name!: string;

  @ApiPropertyOptional({ example: 'Built scalable online store' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe/ecommerce' })
  url?: string;

  @ApiPropertyOptional({ example: ['TypeScript', 'React', 'PostgreSQL'] })
  technologies?: string[];
}

export class ParsedResumeDataDto {
  @ApiProperty({ type: ParsedPersonalInfoDto })
  personalInfo!: ParsedPersonalInfoDto;

  @ApiPropertyOptional({ example: 'Experienced full-stack developer' })
  summary?: string;

  @ApiProperty({ type: [ParsedExperienceDto] })
  experiences!: ParsedExperienceDto[];

  @ApiProperty({ type: [ParsedEducationDto] })
  education!: ParsedEducationDto[];

  @ApiProperty({ example: ['TypeScript', 'React', 'Node.js'] })
  skills!: string[];

  @ApiPropertyOptional({ type: [ParsedCertificationDto] })
  certifications?: ParsedCertificationDto[];

  @ApiPropertyOptional({ type: [ParsedLanguageDto] })
  languages?: ParsedLanguageDto[];

  @ApiPropertyOptional({ type: [ParsedProjectDto] })
  projects?: ParsedProjectDto[];
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
  @IsOptional()
  updatedAt?: string;
}

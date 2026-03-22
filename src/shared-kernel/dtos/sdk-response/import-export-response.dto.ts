/**
 * Import & Export SDK Response DTOs
 *
 * Response types for resume import jobs, export results, and banner previews.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportJobDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({
    example: 'PENDING',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
  status!: string;

  @ApiProperty({ example: 'JSON', enum: ['JSON', 'PDF', 'LINKEDIN'] })
  source!: string;

  @ApiPropertyOptional({ example: 'clxxx...' })
  resumeId?: string;

  @ApiPropertyOptional({ example: 'Invalid format' })
  error?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  completedAt?: string;
}

export class ImportResultDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'clxxx...' })
  resumeId!: string;

  @ApiPropertyOptional({
    example: { section_type_v1: 5, another_section_v2: 2 },
    description: 'Count of items imported per section type',
  })
  sectionsImported?: Record<string, number>;

  @ApiPropertyOptional({ type: [String], example: ['Unknown field: hobby'] })
  warnings?: string[];
}

export class ValidationResultDto {
  @ApiProperty({ example: true })
  valid!: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['Missing required field: name'],
  })
  errors?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Field "objective" is deprecated'],
  })
  warnings?: string[];
}

export class ExportResultDto {
  @ApiProperty({ example: 'https://example.com/download/resume.pdf' })
  downloadUrl!: string;

  @ApiProperty({ example: 'application/pdf' })
  contentType!: string;

  @ApiPropertyOptional({ example: 'resume.pdf' })
  filename?: string;

  @ApiPropertyOptional({ example: 102400 })
  size?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  expiresAt!: string;
}

export class BannerPreviewResponseDto {
  @ApiProperty({ example: 'https://example.com/banner.png' })
  imageUrl!: string;

  @ApiProperty({ example: 1200 })
  width!: number;

  @ApiProperty({ example: 630 })
  height!: number;
}

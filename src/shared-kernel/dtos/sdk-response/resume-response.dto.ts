/**
 * Resume SDK Response DTOs
 *
 * Response types for resume CRUD, sections, and full detail views.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResumeResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'My Resume' })
  title!: string;

  @ApiPropertyOptional({ example: 'en' })
  language?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  targetRole?: string;

  @ApiProperty({ example: false })
  isPublic!: boolean;

  @ApiPropertyOptional({ example: 'my-resume-slug' })
  slug?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class ResumeListItemDto extends ResumeResponseDto {
  @ApiPropertyOptional({ example: 5 })
  viewCount?: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  lastViewedAt?: string;
}

export class ResumeSlotsResponseDto {
  @ApiProperty({ example: 2 })
  used!: number;

  @ApiProperty({ example: 4 })
  limit!: number;

  @ApiProperty({ example: 2 })
  remaining!: number;
}

export class ResumeSectionTypeResponseDto {
  @ApiProperty({ example: 'section-type-1' })
  id!: string;

  @ApiProperty({ example: 'section_type_v1' })
  key!: string;

  @ApiPropertyOptional({ example: 'CUSTOM_SECTION' })
  semanticKind?: string;

  @ApiPropertyOptional({ example: 'Selected Highlights' })
  title?: string;

  @ApiPropertyOptional({ example: 1 })
  version?: number;
}

export class ResumeSectionItemResponseDto {
  @ApiProperty({ example: 'section-item-1' })
  id!: string;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiPropertyOptional({ example: { company: 'Acme', role: 'Engineer' } })
  content?: Record<string, unknown>;
}

export class ResumeSectionResponseDto {
  @ApiProperty({ example: 'resume-section-1' })
  id!: string;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiProperty({ type: ResumeSectionTypeResponseDto })
  sectionType!: ResumeSectionTypeResponseDto;

  @ApiProperty({ type: [ResumeSectionItemResponseDto] })
  items!: ResumeSectionItemResponseDto[];
}

export class ResumeFullResponseDto extends ResumeResponseDto {
  @ApiProperty({ type: [ResumeSectionResponseDto] })
  resumeSections!: ResumeSectionResponseDto[];

  @ApiPropertyOptional({ example: 'John Doe' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  location?: string;

  @ApiPropertyOptional({ example: 'Experienced software engineer...' })
  summary?: string;
}

export class SectionConfigResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'experience' })
  sectionType!: string;

  @ApiProperty({ example: true })
  visible!: boolean;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiPropertyOptional({ example: {} })
  config?: Record<string, unknown>;
}

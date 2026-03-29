/**
 * Resume AST DTOs
 *
 * NestJS DTOs with Swagger decorators for the Resume Abstract Syntax Tree.
 * These DTOs expose the AST structure through the SDK.
 *
 * ARCHITECTURE: The AST is fully generic. Section structure comes from
 * SectionType definitions and section item content, not from hardcoded DTOs.
 *
 * @see ../ast/generic-section-data.schema.ts for generic section schemas
 * @see ../ast/resume-ast.schema.ts for Zod validation schemas
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Generic Section Types
// ============================================================================

export class GenericSectionItemDto {
  @ApiProperty({ example: 'item_123' })
  id!: string;

  @ApiPropertyOptional({ example: 0 })
  order?: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {
      title: 'Senior Software Engineer',
      company: 'Tech Company Inc.',
      startDate: '2020-01',
    },
  })
  content!: Record<string, unknown>;
}

export class GenericSectionDataDto {
  @ApiProperty({ example: 'section_type_v1' })
  sectionTypeKey!: string;

  @ApiPropertyOptional({ example: 'custom_section' })
  semanticKind?: string;

  @ApiPropertyOptional({ example: 'Selected Highlights' })
  title?: string;

  @ApiPropertyOptional({ type: [GenericSectionItemDto] })
  items?: GenericSectionItemDto[];

  @ApiPropertyOptional({ example: 'Markdown or plain text content' })
  content?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { variant: 'timeline' },
  })
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Section Data Types
// ============================================================================

export class SectionDataDto extends GenericSectionDataDto {}

// ============================================================================
// Style Types
// ============================================================================

export class ResolvedTypographyDto {
  @ApiProperty({ example: 'Inter, sans-serif' })
  fontFamily!: string;

  @ApiProperty({ example: 16 })
  fontSizePx!: number;

  @ApiProperty({ example: 1.5 })
  lineHeight!: number;

  @ApiProperty({ example: 400 })
  fontWeight!: number;

  @ApiProperty({
    enum: ['none', 'uppercase', 'lowercase', 'capitalize'],
    example: 'none',
  })
  textTransform!: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  @ApiProperty({ enum: ['none', 'underline', 'line-through'], example: 'none' })
  textDecoration!: 'none' | 'underline' | 'line-through';
}

export class ResolvedBoxStyleDto {
  @ApiProperty({ example: '#ffffff' })
  backgroundColor!: string;

  @ApiProperty({ example: '#e5e5e5' })
  borderColor!: string;

  @ApiProperty({ example: 0 })
  borderWidthPx!: number;

  @ApiProperty({ example: 8 })
  borderRadiusPx!: number;

  @ApiProperty({ example: 16 })
  paddingPx!: number;

  @ApiProperty({ example: 24 })
  marginBottomPx!: number;

  @ApiPropertyOptional({ example: '0 2px 4px rgba(0,0,0,0.1)' })
  shadow?: string;
}

export class SectionStylesDto {
  @ApiProperty({ type: ResolvedBoxStyleDto })
  container!: ResolvedBoxStyleDto;

  @ApiProperty({ type: ResolvedTypographyDto })
  title!: ResolvedTypographyDto;

  @ApiProperty({ type: ResolvedTypographyDto })
  content!: ResolvedTypographyDto;
}

// ============================================================================
// Layout Types
// ============================================================================

export class ColumnDefinitionDto {
  @ApiProperty({ example: 'col_main' })
  id!: string;

  @ApiProperty({ example: 66.67 })
  widthPercentage!: number;

  @ApiProperty({ example: 0 })
  order!: number;
}

export class PageLayoutDto {
  @ApiProperty({ example: 210, description: 'Page width in mm (A4 = 210)' })
  widthMm!: number;

  @ApiProperty({ example: 297, description: 'Page height in mm (A4 = 297)' })
  heightMm!: number;

  @ApiProperty({ example: 20 })
  marginTopMm!: number;

  @ApiProperty({ example: 20 })
  marginBottomMm!: number;

  @ApiProperty({ example: 15 })
  marginLeftMm!: number;

  @ApiProperty({ example: 15 })
  marginRightMm!: number;

  @ApiProperty({ type: [ColumnDefinitionDto] })
  columns!: ColumnDefinitionDto[];

  @ApiProperty({ example: 10 })
  columnGapMm!: number;
}

export class GlobalStylesDto {
  @ApiProperty({ example: '#ffffff' })
  background!: string;

  @ApiProperty({ example: '#1a1a1a' })
  textPrimary!: string;

  @ApiProperty({ example: '#666666' })
  textSecondary!: string;

  @ApiProperty({ example: '#0066cc' })
  accent!: string;
}

export class AstMetaDto {
  @ApiProperty({ example: '1.0.0' })
  version!: string;

  @ApiProperty({ example: '2026-02-15T12:00:00.000Z' })
  generatedAt!: string;
}

// ============================================================================
// Placed Section (combines data + styles + position)
// ============================================================================

export class PlacedSectionDto {
  @ApiProperty({ example: 'sec_experience_1' })
  sectionId!: string;

  @ApiProperty({ example: 'col_main' })
  columnId!: string;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiProperty({
    description:
      'Generic section data. Structure is defined by sectionTypeKey and SectionType metadata.',
    type: GenericSectionDataDto,
    example: {
      sectionTypeKey: 'section_type_v1',
      semanticKind: 'custom_section',
      title: 'Selected Highlights',
      items: [
        {
          id: 'item_1',
          order: 0,
          content: {
            headline: 'Senior Engineer',
            organization: 'Tech Corp',
            startedAt: '2020-01',
            isActive: true,
            highlights: ['Led team of 5'],
            tags: ['TypeScript'],
          },
        },
      ],
    },
  })
  data!: GenericSectionDataDto;

  @ApiProperty({ type: SectionStylesDto })
  styles!: SectionStylesDto;
}

// ============================================================================
// Resume AST (top-level structure)
// ============================================================================

export class ResumeAstDto {
  @ApiProperty({ type: AstMetaDto })
  meta!: AstMetaDto;

  @ApiProperty({ type: PageLayoutDto })
  page!: PageLayoutDto;

  @ApiProperty({ type: [PlacedSectionDto] })
  sections!: PlacedSectionDto[];

  @ApiProperty({ type: GlobalStylesDto })
  globalStyles!: GlobalStylesDto;
}

// ============================================================================
// Response DTOs for endpoints
// ============================================================================

export class DslAstResponseDto {
  @ApiProperty({ type: ResumeAstDto })
  ast!: ResumeAstDto;

  @ApiPropertyOptional({ example: 'clxxx...' })
  resumeId?: string;

  @ApiPropertyOptional({ example: 'john-doe-resume' })
  slug?: string;
}

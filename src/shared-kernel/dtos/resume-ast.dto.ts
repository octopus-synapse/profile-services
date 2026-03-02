/**
 * Resume AST DTOs
 *
 * NestJS DTOs with Swagger decorators for the Resume Abstract Syntax Tree.
 * These DTOs expose the AST structure through the SDK.
 *
 * @see ../ast/resume-ast.schema.ts for Zod validation schemas
 */

import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Date & Location Types
// ============================================================================

export class DateRangeDto {
  @ApiProperty({ example: '2020-01' })
  startDate!: string;

  @ApiPropertyOptional({ example: '2023-06' })
  endDate?: string;

  @ApiProperty({ example: false })
  isCurrent!: boolean;
}

export class LocationDto {
  @ApiPropertyOptional({ example: 'São Paulo' })
  city?: string;

  @ApiPropertyOptional({ example: 'Brazil' })
  country?: string;

  @ApiPropertyOptional({ example: true })
  remote?: boolean;
}

// ============================================================================
// Section Item Types
// ============================================================================

export class ExperienceItemDto {
  @ApiProperty({ example: 'exp_123' })
  id!: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  title!: string;

  @ApiProperty({ example: 'Tech Company Inc.' })
  company!: string;

  @ApiPropertyOptional({ type: LocationDto })
  location?: LocationDto;

  @ApiProperty({ type: DateRangeDto })
  dateRange!: DateRangeDto;

  @ApiPropertyOptional({ example: 'Led development of microservices...' })
  description?: string;

  @ApiProperty({ type: [String], example: ['Reduced latency by 40%'] })
  achievements!: string[];

  @ApiProperty({ type: [String], example: ['TypeScript', 'Node.js'] })
  skills!: string[];
}

export class EducationItemDto {
  @ApiProperty({ example: 'edu_123' })
  id!: string;

  @ApiProperty({ example: 'University of Technology' })
  institution!: string;

  @ApiProperty({ example: "Bachelor's" })
  degree!: string;

  @ApiProperty({ example: 'Computer Science' })
  fieldOfStudy!: string;

  @ApiPropertyOptional({ type: LocationDto })
  location?: LocationDto;

  @ApiProperty({ type: DateRangeDto })
  dateRange!: DateRangeDto;

  @ApiPropertyOptional({ example: '3.8' })
  grade?: string;

  @ApiProperty({ type: [String], example: ['Computer Science Club'] })
  activities!: string[];
}

export class SkillItemDto {
  @ApiProperty({ example: 'skill_123' })
  id!: string;

  @ApiProperty({ example: 'TypeScript' })
  name!: string;

  @ApiPropertyOptional({ example: 'Advanced' })
  level?: string;

  @ApiPropertyOptional({ example: 'Programming Languages' })
  category?: string;
}

export class ProjectItemDto {
  @ApiProperty({ example: 'proj_123' })
  id!: string;

  @ApiProperty({ example: 'Resume Builder' })
  name!: string;

  @ApiPropertyOptional({ example: 'Lead Developer' })
  role?: string;

  @ApiPropertyOptional({ type: DateRangeDto })
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({ example: 'https://example.com' })
  url?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/repo' })
  repositoryUrl?: string;

  @ApiPropertyOptional({ example: 'A modern resume builder' })
  description?: string;

  @ApiProperty({ type: [String], example: ['Built CI/CD pipeline'] })
  highlights!: string[];

  @ApiProperty({ type: [String], example: ['React', 'TypeScript'] })
  technologies!: string[];
}

export class LanguageItemDto {
  @ApiProperty({ example: 'lang_123' })
  id!: string;

  @ApiProperty({ example: 'English' })
  name!: string;

  @ApiProperty({ example: 'Fluent' })
  proficiency!: string;
}

export class CertificationItemDto {
  @ApiProperty({ example: 'cert_123' })
  id!: string;

  @ApiProperty({ example: 'AWS Solutions Architect' })
  name!: string;

  @ApiProperty({ example: 'Amazon Web Services' })
  issuer!: string;

  @ApiProperty({ example: '2023-01' })
  date!: string;

  @ApiPropertyOptional({ example: 'https://aws.amazon.com/verify/...' })
  url?: string;
}

export class InterestItemDto {
  @ApiProperty({ example: 'int_123' })
  id!: string;

  @ApiProperty({ example: 'Open Source' })
  name!: string;

  @ApiProperty({ type: [String], example: ['Linux', 'Contributing'] })
  keywords!: string[];
}

export class ReferenceItemDto {
  @ApiProperty({ example: 'ref_123' })
  id!: string;

  @ApiProperty({ example: 'John Smith' })
  name!: string;

  @ApiProperty({ example: 'CTO' })
  role!: string;

  @ApiPropertyOptional({ example: 'Tech Corp' })
  company?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;
}

export class VolunteerItemDto {
  @ApiProperty({ example: 'vol_123' })
  id!: string;

  @ApiProperty({ example: 'Code for Good' })
  organization!: string;

  @ApiProperty({ example: 'Mentor' })
  role!: string;

  @ApiProperty({ type: DateRangeDto })
  dateRange!: DateRangeDto;

  @ApiPropertyOptional({ example: 'Mentored junior developers' })
  description?: string;
}

export class AwardItemDto {
  @ApiProperty({ example: 'award_123' })
  id!: string;

  @ApiProperty({ example: 'Employee of the Year' })
  title!: string;

  @ApiProperty({ example: 'Tech Company' })
  issuer!: string;

  @ApiProperty({ example: '2023-12' })
  date!: string;

  @ApiPropertyOptional({ example: 'For outstanding contributions' })
  description?: string;
}

export class PublicationItemDto {
  @ApiProperty({ example: 'pub_123' })
  id!: string;

  @ApiProperty({ example: 'Building Scalable Systems' })
  title!: string;

  @ApiProperty({ example: "O'Reilly Media" })
  publisher!: string;

  @ApiProperty({ example: '2023-06' })
  date!: string;

  @ApiPropertyOptional({ example: 'https://example.com/book' })
  url?: string;

  @ApiPropertyOptional({ example: 'A comprehensive guide...' })
  description?: string;
}

// ============================================================================
// Section Data Types (discriminated union as separate DTOs)
// ============================================================================

export class ExperienceSectionDataDto {
  @ApiProperty({ example: 'experience' })
  type!: 'experience';

  @ApiProperty({ type: [ExperienceItemDto] })
  items!: ExperienceItemDto[];
}

export class EducationSectionDataDto {
  @ApiProperty({ example: 'education' })
  type!: 'education';

  @ApiProperty({ type: [EducationItemDto] })
  items!: EducationItemDto[];
}

export class SkillsSectionDataDto {
  @ApiProperty({ example: 'skills' })
  type!: 'skills';

  @ApiProperty({ type: [SkillItemDto] })
  items!: SkillItemDto[];
}

export class ProjectsSectionDataDto {
  @ApiProperty({ example: 'projects' })
  type!: 'projects';

  @ApiProperty({ type: [ProjectItemDto] })
  items!: ProjectItemDto[];
}

export class LanguagesSectionDataDto {
  @ApiProperty({ example: 'languages' })
  type!: 'languages';

  @ApiProperty({ type: [LanguageItemDto] })
  items!: LanguageItemDto[];
}

export class CertificationsSectionDataDto {
  @ApiProperty({ example: 'certifications' })
  type!: 'certifications';

  @ApiProperty({ type: [CertificationItemDto] })
  items!: CertificationItemDto[];
}

export class InterestsSectionDataDto {
  @ApiProperty({ example: 'interests' })
  type!: 'interests';

  @ApiProperty({ type: [InterestItemDto] })
  items!: InterestItemDto[];
}

export class ReferencesSectionDataDto {
  @ApiProperty({ example: 'references' })
  type!: 'references';

  @ApiProperty({ type: [ReferenceItemDto] })
  items!: ReferenceItemDto[];
}

export class VolunteerSectionDataDto {
  @ApiProperty({ example: 'volunteer' })
  type!: 'volunteer';

  @ApiProperty({ type: [VolunteerItemDto] })
  items!: VolunteerItemDto[];
}

export class AwardsSectionDataDto {
  @ApiProperty({ example: 'awards' })
  type!: 'awards';

  @ApiProperty({ type: [AwardItemDto] })
  items!: AwardItemDto[];
}

export class PublicationsSectionDataDto {
  @ApiProperty({ example: 'publications' })
  type!: 'publications';

  @ApiProperty({ type: [PublicationItemDto] })
  items!: PublicationItemDto[];
}

export class SummarySectionDataDto {
  @ApiProperty({ example: 'summary' })
  type!: 'summary';

  @ApiProperty({ example: 'Experienced software engineer...' })
  content!: string;
}

export class CustomSectionDataDto {
  @ApiProperty({ example: 'custom' })
  type!: 'custom';

  @ApiProperty({ example: 'Custom section content' })
  content!: string;
}

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
// Section Data Union Type (for discriminated union)
// ============================================================================

/**
 * Discriminated union of all section data types.
 * This type is used by PlacedSectionDto.data and enables type-safe access
 * based on the `type` discriminator field.
 */
export type SectionDataDto =
  | ExperienceSectionDataDto
  | EducationSectionDataDto
  | SkillsSectionDataDto
  | ProjectsSectionDataDto
  | LanguagesSectionDataDto
  | CertificationsSectionDataDto
  | InterestsSectionDataDto
  | ReferencesSectionDataDto
  | VolunteerSectionDataDto
  | AwardsSectionDataDto
  | PublicationsSectionDataDto
  | SummarySectionDataDto
  | CustomSectionDataDto;

// ============================================================================
// Placed Section (combines data + styles + position)
// ============================================================================

@ApiExtraModels(
  ExperienceSectionDataDto,
  EducationSectionDataDto,
  SkillsSectionDataDto,
  ProjectsSectionDataDto,
  LanguagesSectionDataDto,
  CertificationsSectionDataDto,
  InterestsSectionDataDto,
  ReferencesSectionDataDto,
  VolunteerSectionDataDto,
  AwardsSectionDataDto,
  PublicationsSectionDataDto,
  SummarySectionDataDto,
  CustomSectionDataDto,
)
export class PlacedSectionDto {
  @ApiProperty({ example: 'sec_experience_1' })
  sectionId!: string;

  @ApiProperty({ example: 'col_main' })
  columnId!: string;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiProperty({
    description:
      'Section data object with discriminated type field. Type can be: experience, education, skills, projects, languages, certifications, interests, references, volunteer, awards, publications, summary, custom',
    oneOf: [
      { $ref: '#/components/schemas/ExperienceSectionDataDto' },
      { $ref: '#/components/schemas/EducationSectionDataDto' },
      { $ref: '#/components/schemas/SkillsSectionDataDto' },
      { $ref: '#/components/schemas/ProjectsSectionDataDto' },
      { $ref: '#/components/schemas/LanguagesSectionDataDto' },
      { $ref: '#/components/schemas/CertificationsSectionDataDto' },
      { $ref: '#/components/schemas/InterestsSectionDataDto' },
      { $ref: '#/components/schemas/ReferencesSectionDataDto' },
      { $ref: '#/components/schemas/VolunteerSectionDataDto' },
      { $ref: '#/components/schemas/AwardsSectionDataDto' },
      { $ref: '#/components/schemas/PublicationsSectionDataDto' },
      { $ref: '#/components/schemas/SummarySectionDataDto' },
      { $ref: '#/components/schemas/CustomSectionDataDto' },
    ],
    example: {
      type: 'experience',
      items: [
        {
          id: 'exp_1',
          title: 'Senior Engineer',
          company: 'Tech Corp',
          dateRange: { startDate: '2020-01', isCurrent: true },
          achievements: ['Led team of 5'],
          skills: ['TypeScript'],
        },
      ],
    },
  })
  data!: SectionDataDto;

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

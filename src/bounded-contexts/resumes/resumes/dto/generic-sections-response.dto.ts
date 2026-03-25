import { ApiProperty } from '@nestjs/swagger';

/**
 * Resolved section type — translations already applied for the requested locale.
 * Swagger uses this for documentation; runtime data is built by the locale resolver.
 */
export class ResolvedSectionTypeDto {
  @ApiProperty({}) id!: string;
  @ApiProperty({}) key!: string;
  @ApiProperty({}) slug!: string;
  @ApiProperty({}) semanticKind!: string;
  @ApiProperty({}) version!: number;
  @ApiProperty({}) title!: string;
  @ApiProperty({}) description!: string;
  @ApiProperty({}) label!: string;
  @ApiProperty({}) noDataLabel!: string;
  @ApiProperty({}) placeholder!: string;
  @ApiProperty({}) addLabel!: string;
  @ApiProperty({}) iconType!: string;
  @ApiProperty({}) icon!: string;
  @ApiProperty({}) isActive!: boolean;
  @ApiProperty({}) isSystem!: boolean;
  @ApiProperty({}) isRepeatable!: boolean;
  @ApiProperty({ nullable: true }) minItems!: number | null;
  @ApiProperty({ nullable: true }) maxItems!: number | null;
  @ApiProperty({}) definition!: object;
  @ApiProperty({ nullable: true }) uiSchema!: object | null;
  @ApiProperty({}) renderHints!: object;
  @ApiProperty({}) fieldStyles!: object;
}

export class ResumeSectionTypesDataDto {
  @ApiProperty({ type: [ResolvedSectionTypeDto] })
  sectionTypes!: ResolvedSectionTypeDto[];
}

export class ResumeSectionsDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  sections!: Array<Record<string, unknown>>;
}

export class ResumeSectionItemDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  item!: Record<string, unknown>;
}

export class ResumeSectionDeleteDataDto {
  @ApiProperty({ example: true })
  deleted!: boolean;
}

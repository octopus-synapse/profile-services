import { ApiProperty } from '@nestjs/swagger';

export class ResumeSectionTypesDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  sectionTypes!: Array<Record<string, unknown>>;
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

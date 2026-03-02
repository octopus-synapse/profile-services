import { ApiProperty } from '@nestjs/swagger';

export class ThemeListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  themes!: Array<Record<string, unknown>>;
}

export class ThemeEntityDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  theme!: Record<string, unknown>;
}

export class ThemeNullableEntityDataDto {
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  theme!: Record<string, unknown> | null;
}

export class ThemePaginationDataDto {
  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class ThemePaginatedListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  themes!: Array<Record<string, unknown>>;

  @ApiProperty({ type: ThemePaginationDataDto })
  pagination!: ThemePaginationDataDto;
}

export class ThemeApplyDataDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

export class ThemeResolvedConfigDataDto {
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  config!: Record<string, unknown> | null;
}

export class ResumeConfigOperationDataDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

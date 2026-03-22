/**
 * Skills Catalog SDK Response DTOs
 *
 * Response types for tech skills, niches, and areas.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TechSkillDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'TypeScript' })
  name!: string;

  @ApiPropertyOptional({ example: 'typescript' })
  slug?: string;

  @ApiPropertyOptional({ example: 'programming_language' })
  type?: string;

  @ApiPropertyOptional({ example: 'https://example.com/icon.svg' })
  iconUrl?: string;

  @ApiPropertyOptional({ example: '#3178c6' })
  color?: string;
}

export class TechNicheDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'Frontend Development' })
  name!: string;

  @ApiPropertyOptional({ example: 'frontend-development' })
  slug?: string;

  @ApiPropertyOptional({ example: 'clxxx...' })
  areaId?: string;

  @ApiProperty({ type: [TechSkillDto] })
  skills!: TechSkillDto[];
}

export class TechAreaDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'Software Development' })
  name!: string;

  @ApiPropertyOptional({ example: 'software-development' })
  slug?: string;

  @ApiProperty({ type: [TechNicheDto] })
  niches!: TechNicheDto[];
}

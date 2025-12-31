import {
  IsString,
  IsInt,
  Min,
  MaxLength,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export class CreateLanguageDto {
  @ApiProperty({ example: 'English', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'native', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  level: string;

  @ApiPropertyOptional({
    example: 'B2',
    enum: CEFR_LEVELS,
    description: 'CEFR language proficiency level',
  })
  @IsOptional()
  @IsString()
  @IsIn(CEFR_LEVELS)
  cefrLevel?: string | null;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateLanguageDto extends PartialType(CreateLanguageDto) {}

export class LanguageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  level: string;

  @ApiPropertyOptional({ example: 'B2', enum: CEFR_LEVELS })
  cefrLevel?: string | null;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

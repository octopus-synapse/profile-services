import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateRecommendationDto {
  @ApiProperty({ example: 'John Smith', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  author: string;

  @ApiPropertyOptional({ example: 'Engineering Manager', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  position?: string;

  @ApiPropertyOptional({ example: 'Google', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiProperty({
    example: 'I had the pleasure of working with...',
    maxLength: 5000,
  })
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ example: '2023-06-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateRecommendationDto extends PartialType(
  CreateRecommendationDto,
) {}

export class RecommendationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  author: string;

  @ApiPropertyOptional()
  position?: string;

  @ApiPropertyOptional()
  company?: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  date?: Date;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

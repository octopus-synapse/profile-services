/**
 * Experience DTOs
 * DTOs for work experience step
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ExperienceDto {
  @ApiProperty({ example: 'Google' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  company: string;

  @ApiProperty({ example: 'Senior Engineer' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  position: string;

  @ApiProperty({ example: '2020-01-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2023-12-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCurrent: boolean;

  @ApiProperty({
    example: 'Developed scalable microservices...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'Mountain View, CA', required: false })
  @IsOptional()
  @IsString()
  location?: string;
}

export class ExperiencesStepDto {
  @ApiProperty({ type: [ExperienceDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences?: ExperienceDto[];

  @ApiProperty({ example: false })
  @IsBoolean()
  noExperience: boolean;
}

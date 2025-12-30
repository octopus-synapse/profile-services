/**
 * Skills DTOs
 * DTOs for skills step
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SkillDto {
  @ApiProperty({ example: 'JavaScript' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'Programming Languages' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  category: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  level?: number;
}

export class SkillsStepDto {
  @ApiProperty({ type: [SkillDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills?: SkillDto[];

  @ApiProperty({ example: false })
  @IsBoolean()
  noSkills: boolean;
}

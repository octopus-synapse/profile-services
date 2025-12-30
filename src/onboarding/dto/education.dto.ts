/**
 * Education DTOs
 * DTOs for education step
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

export class EducationDto {
  @ApiProperty({ example: 'MIT' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  institution: string;

  @ApiProperty({ example: "Bachelor's" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  degree: string;

  @ApiProperty({ example: 'Computer Science' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  field: string;

  @ApiProperty({ example: '2015-09-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2019-05-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isCurrent: boolean;
}

export class EducationStepDto {
  @ApiProperty({ type: [EducationDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiProperty({ example: false })
  @IsBoolean()
  noEducation: boolean;
}

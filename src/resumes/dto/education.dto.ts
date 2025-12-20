import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateEducationDto {
  @ApiProperty({ example: 'Stanford University', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  institution: string;

  @ApiProperty({ example: 'Bachelor of Science', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  degree: string;

  @ApiProperty({ example: 'Computer Science', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  field: string;

  @ApiProperty({ example: '2016-09-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2020-06-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ example: 'Stanford, CA', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'Graduated with honors...', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '3.8', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  gpa?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateEducationDto extends PartialType(CreateEducationDto) {}

export class EducationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  institution: string;

  @ApiProperty()
  degree: string;

  @ApiProperty()
  field: string;

  @ApiProperty()
  startDate: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiProperty()
  isCurrent: boolean;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  gpa?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

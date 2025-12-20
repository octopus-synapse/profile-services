import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateAwardDto {
  @ApiProperty({ example: 'Employee of the Year', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Google Inc.', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  issuer: string;

  @ApiProperty({ example: '2023-12-15' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    example: 'Recognized for exceptional performance...',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateAwardDto extends PartialType(CreateAwardDto) {}

export class AwardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  issuer: string;

  @ApiProperty()
  date: Date;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
  IsUrl,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateBugBountyDto {
  @ApiProperty({
    example: 'HackerOne',
    enum: ['HackerOne', 'Bugcrowd', 'YesWeHack', 'Custom'],
    maxLength: 100,
  })
  @IsString()
  @IsIn(['HackerOne', 'Bugcrowd', 'YesWeHack', 'Custom'])
  platform: string;

  @ApiProperty({ example: 'Google', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  company: string;

  @ApiProperty({
    example: 'critical',
    enum: ['critical', 'high', 'medium', 'low'],
  })
  @IsString()
  @IsIn(['critical', 'high', 'medium', 'low'])
  severity: string;

  @ApiProperty({ example: 'XSS', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  vulnerabilityType: string;

  @ApiPropertyOptional({ example: 'CVE-2023-12345', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cveId?: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reward?: number;

  @ApiPropertyOptional({ example: 'USD', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 'https://hackerone.com/reports/123456' })
  @IsOptional()
  @IsUrl()
  reportUrl?: string;

  @ApiProperty({ example: '2023-06-15' })
  @IsDateString()
  reportedAt: string;

  @ApiPropertyOptional({ example: '2023-07-01' })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateBugBountyDto extends PartialType(CreateBugBountyDto) {}

export class BugBountyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  platform: string;

  @ApiProperty()
  company: string;

  @ApiProperty()
  severity: string;

  @ApiProperty()
  vulnerabilityType: string;

  @ApiPropertyOptional()
  cveId?: string;

  @ApiPropertyOptional()
  reward?: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  reportUrl?: string;

  @ApiProperty()
  reportedAt: Date;

  @ApiPropertyOptional()
  resolvedAt?: Date;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

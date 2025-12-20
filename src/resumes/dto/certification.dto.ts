import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCertificationDto {
  @ApiProperty({ example: 'AWS Solutions Architect', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'Amazon Web Services', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  issuer: string;

  @ApiProperty({ example: '2023-03-15' })
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'ABC123XYZ', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  credentialId?: string;

  @ApiPropertyOptional({
    example: 'https://aws.amazon.com/verification/ABC123',
  })
  @IsOptional()
  @IsUrl()
  credentialUrl?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateCertificationDto extends PartialType(
  CreateCertificationDto,
) {}

export class CertificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  issuer: string;

  @ApiProperty()
  issueDate: Date;

  @ApiPropertyOptional()
  expiryDate?: Date;

  @ApiPropertyOptional()
  credentialId?: string;

  @ApiPropertyOptional()
  credentialUrl?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

import { IsEnum, IsOptional, IsString, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsentDocumentType } from '@prisma/client';

export class AcceptConsentDto {
  @ApiProperty({
    enum: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_CONSENT'],
    description: 'Type of document being accepted',
    example: 'TERMS_OF_SERVICE',
  })
  @IsEnum(['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_CONSENT'], {
    message:
      'documentType must be one of: TERMS_OF_SERVICE, PRIVACY_POLICY, MARKETING_CONSENT',
  })
  documentType: ConsentDocumentType;

  @ApiPropertyOptional({
    description: 'IP address of the user (auto-detected if not provided)',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User agent string (auto-detected if not provided)',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

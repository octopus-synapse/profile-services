/**
 * Auth SDK Response DTOs
 *
 * Response types for authentication and two-factor setup.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrentUserResponseDto } from './user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiPropertyOptional({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken?: string;

  @ApiProperty({ type: CurrentUserResponseDto })
  user!: CurrentUserResponseDto;
}

export class TwoFactorSetupResponseDto {
  @ApiProperty({ example: 'otpauth://totp/...' })
  otpauthUrl!: string;

  @ApiProperty({ example: 'JBSWY3DPEHPK3PXP' })
  secret!: string;

  @ApiProperty({ type: [String], example: ['abc123', 'def456'] })
  backupCodes!: string[];
}

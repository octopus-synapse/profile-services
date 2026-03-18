/**
 * Session DTOs
 *
 * Data transfer objects for session validation endpoint.
 */

import { ApiProperty } from '@nestjs/swagger';

export class SessionUserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 'clxxxxx',
  })
  id!: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
    nullable: true,
  })
  name!: string | null;

  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
    nullable: true,
  })
  username!: string | null;

  @ApiProperty({
    description: 'Whether user has completed onboarding',
    example: true,
  })
  hasCompletedOnboarding!: boolean;

  @ApiProperty({
    description: 'Whether email is verified',
    example: true,
  })
  emailVerified!: boolean;

  @ApiProperty({
    description: 'User role',
    example: 'USER',
    enum: ['USER', 'ADMIN', 'APPROVER'],
  })
  role!: string;

  // ============================================================================
  // Calculated fields - frontend should NOT calculate these
  // ============================================================================

  @ApiProperty({
    description: 'Whether user is admin (calculated from role)',
    example: false,
  })
  isAdmin!: boolean;

  @ApiProperty({
    description: 'Whether user is approver (calculated from role)',
    example: false,
  })
  isApprover!: boolean;

  @ApiProperty({
    description: 'Whether user needs to complete onboarding',
    example: false,
  })
  needsOnboarding!: boolean;

  @ApiProperty({
    description: 'Whether user needs email verification',
    example: false,
  })
  needsEmailVerification!: boolean;
}

export class SessionResponseDto {
  @ApiProperty({
    description: 'Whether session is valid',
    example: true,
  })
  authenticated!: boolean;

  @ApiProperty({
    description: 'User data if authenticated',
    type: SessionUserResponseDto,
    nullable: true,
  })
  user!: SessionUserResponseDto | null;
}

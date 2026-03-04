/**
 * Auth DTOs
 *
 * Swagger-compatible DTOs for authentication endpoints.
 * These are class-based for NestJS/Swagger decorator compatibility.
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Login credentials DTO
 */
export class LoginCredentialsDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'securePassword123',
  })
  password!: string;
}

/**
 * Register credentials DTO
 */
export class RegisterCredentialsDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
    example: 'SecurePassword123',
  })
  password!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'John Doe',
    required: false,
  })
  name?: string;
}

/**
 * Refresh token DTO
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;
}

/**
 * Change email DTO
 */
export class ChangeEmailDto {
  @ApiProperty({
    description: 'New email address',
    example: 'newemail@example.com',
  })
  newEmail!: string;

  @ApiProperty({
    description: 'Current password for verification',
    example: 'currentPassword123',
  })
  password!: string;
}

/**
 * Change password DTO
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'oldPassword123',
  })
  currentPassword!: string;

  @ApiProperty({
    description: 'New password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
    example: 'NewSecurePassword123',
  })
  newPassword!: string;
}

/**
 * Forgot password DTO
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send reset link',
    example: 'user@example.com',
  })
  email!: string;
}

/**
 * Reset password DTO
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from email',
    example: 'abc123def456',
  })
  token!: string;

  @ApiProperty({
    description: 'New password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
    example: 'NewSecurePassword123',
  })
  newPassword!: string;
}

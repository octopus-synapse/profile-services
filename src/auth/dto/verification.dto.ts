import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestVerificationDto {
  @ApiProperty({
    description: 'Email address to send verification to',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Verification token received via email',
    example: 'abc123def456',
  })
  @IsString()
  token: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send password reset to',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'abc123def456',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password (min 8 characters)',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (min 8 characters)',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString()
  newPassword: string;
}

import { IsString, IsEmail, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  REGEX,
  PASSWORD_REQUIREMENTS,
} from '../../common/constants/validation.constants';

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
    description: 'New password',
    example: 'NewSecurePass123!',
    minLength: PASSWORD_REQUIREMENTS.MIN_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_REQUIREMENTS.MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`,
  })
  @Matches(REGEX.PASSWORD, {
    message: PASSWORD_REQUIREMENTS.REQUIREMENTS_MESSAGE,
  })
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
    description: 'New password',
    example: 'NewSecurePass123!',
    minLength: PASSWORD_REQUIREMENTS.MIN_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_REQUIREMENTS.MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`,
  })
  @Matches(REGEX.PASSWORD, {
    message: PASSWORD_REQUIREMENTS.REQUIREMENTS_MESSAGE,
  })
  newPassword: string;
}

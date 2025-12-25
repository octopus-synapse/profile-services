import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_REQUIREMENTS } from '../../common/constants/validation.constants';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
    minLength: PASSWORD_REQUIREMENTS.MIN_LENGTH,
    maxLength: 100,
  })
  @IsString()
  @MinLength(PASSWORD_REQUIREMENTS.MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`,
  })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  password: string;
}

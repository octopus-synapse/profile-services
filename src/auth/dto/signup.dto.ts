import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STRING_LENGTH } from '../../common/constants/validation.constants';

export class SignupDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    maxLength: STRING_LENGTH.MAX.EMAIL,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(STRING_LENGTH.MAX.EMAIL, {
    message: `Email must not exceed ${STRING_LENGTH.MAX.EMAIL} characters`,
  })
  email: string;

  @ApiProperty({
    description: 'User password (will be hashed)',
    example: 'SecurePass123!',
    minLength: STRING_LENGTH.MIN.PASSWORD,
  })
  @IsString()
  @MinLength(STRING_LENGTH.MIN.PASSWORD, {
    message: `Password must be at least ${STRING_LENGTH.MIN.PASSWORD} characters`,
  })
  password: string;

  @ApiProperty({
    description: 'User display name (optional)',
    example: 'John Doe',
    required: false,
    minLength: STRING_LENGTH.MIN.NAME,
    maxLength: STRING_LENGTH.MAX.NAME,
  })
  @IsOptional()
  @IsString()
  @MinLength(STRING_LENGTH.MIN.NAME)
  @MaxLength(STRING_LENGTH.MAX.NAME)
  name?: string;
}

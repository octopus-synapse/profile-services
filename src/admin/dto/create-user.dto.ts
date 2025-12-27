import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  STRING_LENGTH,
  REGEX,
  PASSWORD_REQUIREMENTS,
} from '../../common/constants/validation.constants';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(STRING_LENGTH.MAX.EMAIL)
  email: string;

  @ApiProperty({
    description: 'User password (will be hashed)',
    example: 'SecurePass123!',
  })
  @IsString()
  @MinLength(PASSWORD_REQUIREMENTS.MIN_LENGTH)
  @Matches(REGEX.PASSWORD, {
    message: PASSWORD_REQUIREMENTS.REQUIREMENTS_MESSAGE,
  })
  password: string;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(STRING_LENGTH.MIN.NAME)
  @MaxLength(STRING_LENGTH.MAX.NAME)
  name?: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    default: UserRole.USER,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

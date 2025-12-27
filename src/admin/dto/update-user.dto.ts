import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STRING_LENGTH } from '../../common/constants/validation.constants';
import { UserRole } from '../../common/enums/user-role.enum';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(STRING_LENGTH.MAX.EMAIL)
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(STRING_LENGTH.MIN.NAME)
  @MaxLength(STRING_LENGTH.MAX.NAME)
  name?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasCompletedOnboarding?: boolean;
}

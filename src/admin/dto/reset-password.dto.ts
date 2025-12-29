import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  REGEX,
  PASSWORD_REQUIREMENTS,
} from '../../common/constants/validation.constants';

export class AdminResetPasswordDto {
  @ApiProperty({
    description: 'New password for the user',
    example: 'NewSecurePass123!',
  })
  @IsString()
  @MinLength(PASSWORD_REQUIREMENTS.MIN_LENGTH)
  @Matches(REGEX.PASSWORD, {
    message: PASSWORD_REQUIREMENTS.REQUIREMENTS_MESSAGE,
  })
  newPassword: string;
}

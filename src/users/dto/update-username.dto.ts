import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  STRING_LENGTH,
  REGEX,
} from '../../common/constants/validation.constants';

export class UpdateUsernameDto {
  @ApiProperty({
    description: 'New username (letters, numbers, underscore, hyphen)',
    example: 'john_doe',
    minLength: STRING_LENGTH.MIN.USERNAME,
    maxLength: STRING_LENGTH.MAX.USERNAME,
  })
  @IsString()
  @MinLength(STRING_LENGTH.MIN.USERNAME, {
    message: `Username must be at least ${STRING_LENGTH.MIN.USERNAME} characters`,
  })
  @MaxLength(STRING_LENGTH.MAX.USERNAME, {
    message: `Username must be at most ${STRING_LENGTH.MAX.USERNAME} characters`,
  })
  @Matches(REGEX.USERNAME, {
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username: string;
}

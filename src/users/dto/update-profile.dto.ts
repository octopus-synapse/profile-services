import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  IsUrl,
} from 'class-validator';
import {
  STRING_LENGTH,
  REGEX,
} from '../../common/constants/validation.constants';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(STRING_LENGTH.MAX.NAME)
  displayName?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid photo URL' })
  @MaxLength(STRING_LENGTH.MAX.URL)
  photoURL?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STRING_LENGTH.MAX.BIO)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STRING_LENGTH.MAX.NAME)
  location?: string;

  @IsOptional()
  @IsString()
  @Matches(REGEX.PHONE, { message: 'Invalid phone number format' })
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid website URL' })
  @MaxLength(STRING_LENGTH.MAX.URL)
  website?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid LinkedIn URL' })
  @MaxLength(STRING_LENGTH.MAX.URL)
  linkedin?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid GitHub URL' })
  @MaxLength(STRING_LENGTH.MAX.URL)
  github?: string;
}

import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { STRING_LENGTH } from '../../common/constants/validation.constants';

export class CreateResumeDto {
  @IsOptional()
  @IsString()
  @MaxLength(STRING_LENGTH.MAX.TITLE)
  title?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(STRING_LENGTH.MAX.NAME)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STRING_LENGTH.MAX.TITLE)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  emailContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STRING_LENGTH.MAX.NAME)
  location?: string;

  @IsOptional()
  @IsUrl()
  linkedin?: string;

  @IsOptional()
  @IsUrl()
  github?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STRING_LENGTH.MAX.DESCRIPTION)
  summary?: string;
}

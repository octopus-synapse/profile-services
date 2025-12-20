import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';
import { STRING_LENGTH } from '../../common/constants/validation.constants';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  palette?: string;

  @IsOptional()
  @IsString()
  bannerColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STRING_LENGTH.MAX.NAME)
  displayName?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid photo URL' })
  @MaxLength(STRING_LENGTH.MAX.URL)
  photoURL?: string;
}

import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateFullPreferencesDto {
  @IsOptional()
  @IsString()
  palette?: string;

  @IsOptional()
  @IsString()
  bannerColor?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['public', 'private', 'unlisted'])
  profileVisibility?: string;
}

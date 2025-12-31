import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Authentication Environment Variables
 */
export class AuthEnvironmentVariables {
  @IsNotEmpty()
  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRATION?: string;
}

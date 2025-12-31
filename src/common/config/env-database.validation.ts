import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Database Environment Variables
 */
export class DatabaseEnvironmentVariables {
  @IsNotEmpty()
  @IsString()
  DATABASE_URL: string;
}

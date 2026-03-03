import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Refresh token to invalidate',
    example: 'uuid-refresh-token',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Logout from all sessions',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  logoutAllSessions?: boolean;
}

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Logged out successfully.',
  })
  message: string;
}

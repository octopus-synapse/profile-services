import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeactivateAccountDto {
  @ApiPropertyOptional({
    description: 'Reason for deactivation',
    example: 'Taking a break from the platform',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DeactivateAccountResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Account has been deactivated.',
  })
  message: string;
}

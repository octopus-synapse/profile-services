import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'CurrentPass123!',
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

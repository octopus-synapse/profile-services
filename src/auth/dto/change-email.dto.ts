import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailDto {
  @ApiProperty({
    description: 'New email address',
    example: 'newemail@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  newEmail: string;

  @ApiProperty({
    description: 'Current password for verification',
    example: 'CurrentPass123!',
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  currentPassword: string;
}

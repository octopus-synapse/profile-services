import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token',
    example: 'abc123-verification-token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty({
    description: 'Verified email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Confirmation message',
    example: 'Email has been verified successfully.',
  })
  message: string;
}

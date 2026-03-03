import { ApiProperty } from '@nestjs/swagger';

export class SendVerificationEmailResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Verification email has been sent.',
  })
  message: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Confirmation phrase: "DELETE MY ACCOUNT"',
    example: 'DELETE MY ACCOUNT',
  })
  @IsString()
  @IsNotEmpty()
  confirmationPhrase: string;
}

export class DeleteAccountResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Account has been permanently deleted.',
  })
  message: string;
}

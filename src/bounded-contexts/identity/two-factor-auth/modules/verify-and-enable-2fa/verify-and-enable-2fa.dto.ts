import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyAndEnable2faRequestDto {
  @ApiProperty({
    description: '6-digit TOTP token from authenticator app',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token!: string;
}

export class VerifyAndEnable2faResponseDto {
  @ApiProperty({
    description: 'Backup codes (shown only once)',
    example: ['ABCD-1234', 'EFGH-5678'],
    type: [String],
  })
  backupCodes!: string[];
}

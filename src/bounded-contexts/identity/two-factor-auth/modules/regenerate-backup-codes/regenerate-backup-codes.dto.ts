import { ApiProperty } from '@nestjs/swagger';

export class RegenerateBackupCodesResponseDto {
  @ApiProperty({
    description: 'New backup codes (shown only once)',
    example: ['ABCD-1234', 'EFGH-5678'],
    type: [String],
  })
  backupCodes!: string[];
}

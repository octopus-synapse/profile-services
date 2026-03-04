import { ApiProperty } from '@nestjs/swagger';

export class Get2faStatusResponseDto {
  @ApiProperty({
    description: 'Whether 2FA is enabled',
    example: true,
  })
  enabled!: boolean;

  @ApiProperty({
    description: 'Last time 2FA was used',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  lastUsedAt!: Date | null;

  @ApiProperty({
    description: 'Number of unused backup codes remaining',
    example: 8,
  })
  backupCodesRemaining!: number;
}

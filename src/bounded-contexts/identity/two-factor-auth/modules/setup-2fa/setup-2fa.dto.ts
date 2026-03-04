import { ApiProperty } from '@nestjs/swagger';

export class Setup2faResponseDto {
  @ApiProperty({
    description: 'Base32 encoded TOTP secret',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret!: string;

  @ApiProperty({
    description: 'QR code as data URL for authenticator apps',
    example: 'data:image/png;base64,...',
  })
  qrCode!: string;

  @ApiProperty({
    description: 'Manual entry key for authenticator apps',
    example: 'JBSWY3DPEHPK3PXP',
  })
  manualEntryKey!: string;
}

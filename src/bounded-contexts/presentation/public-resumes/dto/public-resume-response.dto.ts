import { ApiProperty } from '@nestjs/swagger';

export class PublicShareInfoDto {
  @ApiProperty({ example: 'my-resume-share' })
  slug!: string;

  @ApiProperty({ nullable: true, type: String, example: '2026-12-31T23:59:59.000Z' })
  expiresAt!: Date | null;
}

export class PublicResumeDataDto {
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  resume!: object | null;

  @ApiProperty({ type: PublicShareInfoDto })
  share!: PublicShareInfoDto;
}

import { ApiProperty } from '@nestjs/swagger';

export class ShareLinkDataDto {
  @ApiProperty({ example: 'share-1' })
  id!: string;

  @ApiProperty({ example: 'my-resume' })
  slug!: string;

  @ApiProperty({ example: 'resume-1' })
  resumeId!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: false })
  hasPassword!: boolean;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  expiresAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '/api/v1/public/resumes/my-resume' })
  publicUrl!: string;
}

export class ShareCreateDataDto {
  @ApiProperty({ type: ShareLinkDataDto })
  share!: ShareLinkDataDto;
}

export class ShareListDataDto {
  @ApiProperty({ type: [ShareLinkDataDto] })
  shares!: ShareLinkDataDto[];
}

export class ShareDeleteDataDto {
  @ApiProperty({ example: true })
  deleted!: boolean;
}

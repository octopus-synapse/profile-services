import { ApiProperty } from '@nestjs/swagger';

export class ResumeVersionItemDto {
  @ApiProperty({ example: 'version-1' })
  id!: string;

  @ApiProperty({ example: 3 })
  versionNumber!: number;

  @ApiProperty({ nullable: true, example: 'Before major edits' })
  label!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class ResumeVersionListDataDto {
  @ApiProperty({ type: [ResumeVersionItemDto] })
  versions!: ResumeVersionItemDto[];
}

export class ResumeVersionDataDto {
  @ApiProperty({ type: ResumeVersionItemDto })
  version!: ResumeVersionItemDto;
}

export class ResumeVersionRestoreDataDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  restoredFrom!: Date;
}

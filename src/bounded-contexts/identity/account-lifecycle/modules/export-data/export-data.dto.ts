import { ApiProperty } from '@nestjs/swagger';

class UserDataDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) username!: string | null;
  @ApiProperty() hasCompletedOnboarding!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

class ConsentDto {
  @ApiProperty() documentType!: string;
  @ApiProperty() version!: string;
  @ApiProperty() acceptedAt!: string;
  @ApiProperty({ nullable: true }) ipAddress!: string | null;
  @ApiProperty({ nullable: true }) userAgent!: string | null;
}

class ResumeItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() order!: number;
  @ApiProperty() content!: unknown;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

class ResumeSectionDto {
  @ApiProperty() sectionTypeKey!: string;
  @ApiProperty() semanticKind!: string;
  @ApiProperty({ type: [ResumeItemDto] }) items!: ResumeItemDto[];
}

class ResumeDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) title!: string | null;
  @ApiProperty({ nullable: true }) slug!: string | null;
  @ApiProperty() isPublic!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty() personalInfo!: unknown;
  @ApiProperty({ type: [ResumeSectionDto] }) sections!: ResumeSectionDto[];
}

class AuditLogDto {
  @ApiProperty() action!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty() entityId!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true }) ipAddress!: string | null;
}

export class ExportDataResponseDto {
  @ApiProperty({
    description: 'Timestamp when the export was generated',
    example: '2024-01-01T00:00:00.000Z',
  })
  exportedAt!: string;

  @ApiProperty({
    description: 'Data retention policy explanation',
  })
  dataRetentionPolicy!: string;

  @ApiProperty({ type: UserDataDto })
  user!: UserDataDto;

  @ApiProperty({ type: [ConsentDto] })
  consents!: ConsentDto[];

  @ApiProperty({ type: [ResumeDto] })
  resumes!: ResumeDto[];

  @ApiProperty({ type: [AuditLogDto] })
  auditLogs!: AuditLogDto[];
}

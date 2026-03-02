import { ApiProperty } from '@nestjs/swagger';

export class ResumeListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  resumes!: Array<Record<string, unknown>>;
}

export class ResumeDetailsDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  resume!: Record<string, unknown>;
}

export class ResumeOperationMessageDataDto {
  @ApiProperty({ example: 'Resume deleted successfully' })
  message!: string;
}

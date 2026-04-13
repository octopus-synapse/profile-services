import { ApiProperty } from '@nestjs/swagger';

export class ThemeResolvedConfigDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  config!: Record<string, unknown> | null;
}

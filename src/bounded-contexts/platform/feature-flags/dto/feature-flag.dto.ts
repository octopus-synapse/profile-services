import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class FeatureFlagEvaluationDto {
  @ApiProperty({
    description: 'Map of flag key to effective boolean state for the calling user.',
    additionalProperties: { type: 'boolean' },
    example: { 'resumes.export.pdf': true },
  })
  flags!: Record<string, boolean>;
}

export class FeatureFlagAdminRowDto {
  @ApiProperty() key!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ type: [String] }) enabledForRoles!: string[];
  @ApiProperty() deprecated!: boolean;
  @ApiProperty({ type: [String] }) dependsOn!: string[];
  @ApiProperty({
    type: [String],
    description: 'Parents currently OFF blocking this from turning ON.',
  })
  blockedBy!: string[];
  @ApiProperty({ description: 'Effective state ignoring roles (global view).' })
  effectiveGlobal!: boolean;
}

export class FeatureFlagAdminListDto {
  @ApiProperty({ type: [FeatureFlagAdminRowDto] })
  flags!: FeatureFlagAdminRowDto[];
}

/** New enabled state (omit to leave unchanged) + optional role allow-list. */
const ToggleFeatureFlagSchema = z
  .object({
    enabled: z.boolean().optional(),
    enabledForRoles: z.array(z.string()).optional(),
  })
  .strict();

export class ToggleFeatureFlagDto extends createZodDto(ToggleFeatureFlagSchema) {}

export class FeatureFlagImpactNodeDto {
  @ApiProperty() key!: string;
  @ApiProperty({ type: () => [FeatureFlagImpactNodeDto] })
  children!: FeatureFlagImpactNodeDto[];
}

export class FeatureFlagImpactDto {
  @ApiProperty({ type: FeatureFlagImpactNodeDto })
  tree!: FeatureFlagImpactNodeDto;
}

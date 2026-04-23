import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

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

export class ToggleFeatureFlagDto {
  @ApiPropertyOptional({ description: 'New enabled state. Omit to leave unchanged.' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Roles allowed when enabled. Empty array = no restriction.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledForRoles?: string[];
}

export class FeatureFlagImpactNodeDto {
  @ApiProperty() key!: string;
  @ApiProperty({ type: () => [FeatureFlagImpactNodeDto] })
  children!: FeatureFlagImpactNodeDto[];
}

export class FeatureFlagImpactDto {
  @ApiProperty({ type: FeatureFlagImpactNodeDto })
  tree!: FeatureFlagImpactNodeDto;
}

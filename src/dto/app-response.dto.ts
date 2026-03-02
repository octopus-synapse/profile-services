/**
 * App Controller Response DTOs
 * DTOs for root-level application endpoints
 */

import { ApiProperty } from '@nestjs/swagger';

export class HelloDataDto {
  @ApiProperty({ example: 'Hello from Profile Services!' })
  message!: string;
}

export class HealthDataDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: '2026-02-25T10:30:00.000Z' })
  timestamp!: string;
}

export class VersionDataDto {
  @ApiProperty({ example: 'profile-services' })
  service!: string;

  @ApiProperty({ example: 'v1.2.3' })
  version!: string;

  @ApiProperty({ example: 'v1.0.0' })
  contracts_version!: string;

  @ApiProperty({ example: 'production' })
  environment!: string;

  @ApiProperty({ example: '2026-02-25T10:00:00.000Z' })
  deployed_at!: string;

  @ApiProperty({ example: 'v1.2.3' })
  git_tag!: string;

  @ApiProperty({ example: false })
  is_rollback!: boolean;
}

export class OpenApiSpecDataDto {
  @ApiProperty({ description: 'OpenAPI specification object', type: Object })
  spec!: Record<string, unknown>;
}

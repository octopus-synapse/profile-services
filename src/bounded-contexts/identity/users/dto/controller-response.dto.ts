import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class UserManagementListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  users!: Array<Record<string, unknown>>;

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class UserDetailsDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  user!: Record<string, unknown>;
}

export class UserMutationDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  user!: Record<string, unknown>;

  @ApiProperty({ example: 'User created successfully' })
  message!: string;
}

export class UserOperationMessageDataDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}

export class PublicProfileDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  user!: Record<string, unknown>;

  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  resume!: Record<string, unknown> | null;
}

export class UserProfileDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  profile!: Record<string, unknown>;
}

export class UsernameUpdateDataDto {
  @ApiProperty({ example: 'new_username', nullable: true })
  username!: string | null;

  @ApiProperty({ example: 'Username updated successfully' })
  message!: string;
}

export class UsernameAvailabilityDataDto {
  @ApiProperty({ example: 'john_doe' })
  username!: string;

  @ApiProperty({ example: true })
  available!: boolean;
}

export class UserPreferencesDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  preferences!: Record<string, unknown>;
}

export class UserFullPreferencesDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  preferences!: Record<string, unknown>;
}

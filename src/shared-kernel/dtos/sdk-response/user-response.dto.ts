/**
 * User SDK Response DTOs
 *
 * Response types for user profile, preferences, and management.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  username?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  photoURL?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  bio?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  location?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.com' })
  website?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  linkedin?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe' })
  github?: string;

  @ApiPropertyOptional({ example: 'https://twitter.com/johndoe' })
  twitter?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class PublicProfileResponseDto {
  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  photoURL?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  bio?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  location?: string;
}

export class UserPreferencesResponseDto {
  @ApiPropertyOptional({ example: 'dark' })
  palette?: string;

  @ApiPropertyOptional({ example: '#3b82f6' })
  bannerColor?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  photoURL?: string;
}

export class UserFullPreferencesResponseDto extends UserPreferencesResponseDto {
  @ApiPropertyOptional({ example: 'en' })
  language?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  timezone?: string;

  @ApiPropertyOptional({ example: true })
  emailNotifications?: boolean;

  @ApiPropertyOptional({ example: false })
  marketingEmails?: boolean;
}

export class UsernameUpdateResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'newusername' })
  username!: string;
}

export class UsernameValidationResponseDto {
  @ApiProperty({ example: true })
  available!: boolean;

  @ApiPropertyOptional({ example: 'Username is already taken' })
  message?: string;
}

export class UserListItemDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  username?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN', 'MODERATOR'] })
  role!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;
}

export class UserDetailsResponseDto extends UserProfileResponseDto {
  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN', 'MODERATOR'] })
  role!: string;

  @ApiProperty({ example: true })
  emailVerified!: boolean;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  lastLoginAt?: string;
}

export class CurrentUserResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  username?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN', 'MODERATOR'] })
  role!: string;

  @ApiProperty({ example: true })
  emailVerified!: boolean;
}

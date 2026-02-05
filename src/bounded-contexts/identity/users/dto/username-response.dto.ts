/**
 * User Response DTOs with Swagger decorators
 *
 * These DTOs ensure proper OpenAPI/Swagger documentation generation.
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Username validation error codes
 */
export enum UsernameValidationErrorCode {
  TOO_SHORT = 'TOO_SHORT',
  TOO_LONG = 'TOO_LONG',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_START = 'INVALID_START',
  INVALID_END = 'INVALID_END',
  CONSECUTIVE_UNDERSCORES = 'CONSECUTIVE_UNDERSCORES',
  RESERVED = 'RESERVED',
  UPPERCASE = 'UPPERCASE',
  ALREADY_TAKEN = 'ALREADY_TAKEN',
}

/**
 * Username validation error DTO
 */
export class UsernameValidationErrorDto {
  @ApiProperty({
    enum: UsernameValidationErrorCode,
    description: 'Error code identifying the validation failure',
    example: UsernameValidationErrorCode.TOO_SHORT,
  })
  code: UsernameValidationErrorCode;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Username must be at least 3 characters',
  })
  message: string;
}

/**
 * Validate username response DTO
 */
export class ValidateUsernameResponseDto {
  @ApiProperty({
    description: 'The username that was validated',
    example: 'john_doe',
  })
  username: string;

  @ApiProperty({
    description: 'Whether the username passes all format validations',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description:
      'Whether the username is available (not taken by another user)',
    example: true,
    required: false,
  })
  available?: boolean;

  @ApiProperty({
    type: [UsernameValidationErrorDto],
    description: 'List of validation errors (empty if valid)',
    example: [],
  })
  errors: UsernameValidationErrorDto[];
}

/**
 * Check username availability response DTO
 */
export class CheckUsernameResponseDto {
  @ApiProperty({
    description: 'Whether the username is available',
    example: true,
  })
  available: boolean;

  @ApiProperty({
    description: 'Optional message about username availability',
    example: 'Username is available',
    required: false,
  })
  message?: string;
}

/**
 * Update username response DTO
 */
export class UpdateUsernameResponseDto {
  @ApiProperty({
    description: 'Whether the update was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Status message',
    example: 'Username updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'The updated username',
    example: 'john_doe',
  })
  username: string;
}

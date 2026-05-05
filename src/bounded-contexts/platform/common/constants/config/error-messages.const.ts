/**
 * Error Messages Constants
 *
 * Standardized error messages for consistent API responses.
 */
export const ERROR_MESSAGES = {
  // Auth
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized access',
  PASSWORD_INCORRECT: 'Password is incorrect',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
  EMAIL_ALREADY_IN_USE: 'Email already in use',
  USERNAME_ALREADY_IN_USE: 'Username is already taken',
  USERNAME_MUST_BE_LOWERCASE: 'Username must contain only lowercase letters',
  USERNAME_RESERVED: 'This username is reserved and cannot be used',
  USERNAME_INVALID_FORMAT:
    'Username must start with a letter and contain only lowercase letters, numbers, and underscores',
  USERNAME_INVALID_UNDERSCORES:
    'Username cannot have consecutive underscores or end with an underscore',
  CANNOT_DELETE_LAST_ADMIN: 'Cannot delete the last admin account',
  CANNOT_REMOVE_LAST_ADMIN_ROLE: 'Cannot remove admin role from the last admin account',
  INVALID_INTERNAL_TOKEN: 'Invalid internal token', // Tokens
  INVALID_VERIFICATION_TOKEN: 'Invalid or expired verification token',
  INVALID_RESET_TOKEN: 'Invalid or expired reset token',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_REVOKED: 'Token has been revoked',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before continuing', // Validation
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PASSWORD: 'Password must be at least 8 characters',
  INVALID_DATE: 'Invalid date format',
  ID_REQUIRED: 'ID is required',
  ID_MUST_BE_STRING: 'ID must be a string',
  NO_FILE_PROVIDED: 'No file provided', // Resources
  RESUME_NOT_FOUND: 'Resume not found',
  RESUME_NOT_FOUND_FOR_USER: 'Resume not found for this user',
  RESUME_ACCESS_DENIED: 'Resume not found or access denied',
  SKILL_NOT_FOUND: 'Skill not found',
  SECTION_NOT_FOUND: 'Section not found',
  RESOURCE_NOT_FOUND: 'Resource not found',
  ACCESS_DENIED: 'Access denied to this resource',
  PUBLIC_PROFILE_NOT_FOUND: 'Public profile not found',
  ONLY_ADMINS_CAN_DO_THIS: 'Only administrators can perform this action',
  REJECTION_REASON_REQUIRED: 'Rejection reason is required', // Config Validation
  LAYOUT_CONFIG_REQUIRED: 'Layout config is required',
  SECTIONS_MUST_BE_ARRAY: 'Sections must be an array',
  ITEM_OVERRIDES_MUST_BE_OBJECT: 'Item overrides must be an object', // Upload
  FILE_UPLOAD_UNAVAILABLE: 'File upload service unavailable', // Export
  EXPORT_FAILED: 'Failed to export document',
  INVALID_EXPORT_FORMAT: 'Invalid export format', // Server
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable', // Distributed Lock (BUG-004)
  DISTRIBUTED_LOCK_UNAVAILABLE:
    'Distributed locking is unavailable. Critical operations cannot proceed.',
  LOCK_ACQUISITION_FAILED: 'Could not acquire lock for operation', // Rate Limiting
  TOO_MANY_LOGIN_ATTEMPTS: 'Too many login attempts. Please try again later.',
  TOO_MANY_PASSWORD_RESET_REQUESTS: 'Too many password reset requests. Please try again later.',
  TOO_MANY_SYNC_REQUESTS: 'Daily sync limit reached. Please try again tomorrow.', // Business Limits
  SESSION_LIMIT_REACHED: 'Maximum number of active sessions reached (5)',
} as const;

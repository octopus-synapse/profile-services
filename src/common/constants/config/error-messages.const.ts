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
  CANNOT_DELETE_LAST_ADMIN: 'Cannot delete the last admin account',
  INVALID_INTERNAL_TOKEN: 'Invalid internal token',

  // Tokens
  INVALID_VERIFICATION_TOKEN: 'Invalid or expired verification token',
  INVALID_RESET_TOKEN: 'Invalid or expired reset token',
  TOKEN_EXPIRED: 'Token has expired',

  // Validation
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PASSWORD: 'Password must be at least 8 characters',
  INVALID_DATE: 'Invalid date format',
  ID_REQUIRED: 'ID is required',
  ID_MUST_BE_STRING: 'ID must be a string',
  NO_FILE_PROVIDED: 'No file provided',

  // Resources
  RESUME_NOT_FOUND: 'Resume not found',
  RESUME_NOT_FOUND_FOR_USER: 'Resume not found for this user',
  RESUME_ACCESS_DENIED: 'Resume not found or access denied',
  SKILL_NOT_FOUND: 'Skill not found',
  SECTION_NOT_FOUND: 'Section not found',
  RESOURCE_NOT_FOUND: 'Resource not found',
  ACCESS_DENIED: 'Access denied to this resource',
  PUBLIC_PROFILE_NOT_FOUND: 'Public profile not found',

  // Themes
  THEME_NOT_FOUND: 'Theme not found',
  THEME_ACCESS_DENIED: 'Theme not found or access denied',
  CANNOT_DELETE_SYSTEM_THEMES: 'Cannot delete system themes',
  CAN_ONLY_DELETE_OWN_THEMES: 'Can only delete own themes',
  CAN_ONLY_EDIT_OWN_THEMES: 'Can only edit own themes',
  ONLY_ADMINS_CAN_EDIT_SYSTEM_THEMES: 'Only admins can edit system themes',
  CAN_ONLY_SUBMIT_OWN_THEMES: 'Can only submit own themes',
  THEME_MUST_BE_PRIVATE_OR_REJECTED: 'Theme must be private or rejected',
  THEME_NOT_PENDING_APPROVAL: 'Theme is not pending approval',
  CANNOT_APPROVE_OWN_THEMES: 'Cannot approve own themes',
  REJECTION_REASON_REQUIRED: 'Rejection reason is required',
  CANNOT_FORK_THEME: 'Cannot fork this theme',

  // Config Validation
  LAYOUT_CONFIG_REQUIRED: 'Layout config is required',
  SECTIONS_MUST_BE_ARRAY: 'Sections must be an array',
  ITEM_OVERRIDES_MUST_BE_OBJECT: 'Item overrides must be an object',

  // Upload
  FILE_UPLOAD_UNAVAILABLE: 'File upload service unavailable',

  // Export
  EXPORT_FAILED: 'Failed to export document',
  INVALID_EXPORT_FORMAT: 'Invalid export format',

  // Server
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
} as const;

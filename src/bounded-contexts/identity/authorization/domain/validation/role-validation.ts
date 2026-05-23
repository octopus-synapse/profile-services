/**
 * Role Validation Rules
 *
 * Pure validation functions for Role entity.
 * Extracted for testability and reusability.
 */

interface RolePropsForValidation {
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
}

export interface RoleValidationResult {
  isValid: boolean;
  errors: string[];
}

const VALID_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const MAX_NAME_LENGTH = 50;
const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export function validateRoleName(name: string): string | null {
  if (!name || name.length === 0) {
    return 'Role name cannot be empty';
  }
  if (!VALID_NAME_PATTERN.test(name)) {
    return `Role name "${name}" must start with lowercase letter and contain only lowercase letters, numbers, and underscores`;
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Role name cannot exceed ${MAX_NAME_LENGTH} characters`;
  }
  return null;
}

export function validateRoleDisplayName(displayName: string): string | null {
  if (!displayName || displayName.length === 0) {
    return 'Role displayName cannot be empty';
  }
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return `Role displayName cannot exceed ${MAX_DISPLAY_NAME_LENGTH} characters`;
  }
  return null;
}

export function validateRoleDescription(description?: string): string | null {
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    return `Role description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  return null;
}

export function validateRole(props: RolePropsForValidation): RoleValidationResult {
  const errors: string[] = [];

  const nameError = validateRoleName(props.name);
  if (nameError) errors.push(nameError);

  const displayNameError = validateRoleDisplayName(props.displayName);
  if (displayNameError) errors.push(displayNameError);

  const descriptionError = validateRoleDescription(props.description);
  if (descriptionError) errors.push(descriptionError);

  return { isValid: errors.length === 0, errors };
}

/** Throws if validation fails */
export function assertRoleValid(props: RolePropsForValidation): void {
  const result = validateRole(props);
  if (!result.isValid) {
    throw new Error(result.errors[0]);
  }
}

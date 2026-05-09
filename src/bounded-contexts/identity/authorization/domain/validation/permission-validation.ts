/**
 * Permission Validation Rules
 *
 * Pure validation functions for Permission entity.
 * Extracted for testability and reusability.
 */

interface PermissionPropsForValidation {
  readonly resource: string;
  readonly action: string;
}

export interface PermissionValidationResult {
  isValid: boolean;
  errors: string[];
}

const VALID_PATTERN = /^[a-z][a-z0-9_]*$/;

export function validatePermissionResource(resource: string): string | null {
  if (!resource || resource.length === 0) {
    return 'Permission resource cannot be empty';
  }
  if (resource.includes(':')) {
    return 'Permission resource cannot contain ":"';
  }
  if (resource !== '*' && !VALID_PATTERN.test(resource)) {
    return `Permission resource "${resource}" must start with lowercase letter and contain only lowercase letters, numbers, and underscores`;
  }
  return null;
}

export function validatePermissionAction(action: string): string | null {
  if (!action || action.length === 0) {
    return 'Permission action cannot be empty';
  }
  if (action.includes(':')) {
    return 'Permission action cannot contain ":"';
  }
  if (!VALID_PATTERN.test(action)) {
    return `Permission action "${action}" must start with lowercase letter and contain only lowercase letters, numbers, and underscores`;
  }
  return null;
}

export function validatePermission(
  props: PermissionPropsForValidation,
): PermissionValidationResult {
  const errors: string[] = [];

  const resourceError = validatePermissionResource(props.resource);
  if (resourceError) errors.push(resourceError);

  const actionError = validatePermissionAction(props.action);
  if (actionError) errors.push(actionError);

  return { isValid: errors.length === 0, errors };
}

/** Throws if validation fails */
export function assertPermissionValid(props: PermissionPropsForValidation): void {
  const result = validatePermission(props);
  if (!result.isValid) {
    throw new Error(result.errors[0]);
  }
}

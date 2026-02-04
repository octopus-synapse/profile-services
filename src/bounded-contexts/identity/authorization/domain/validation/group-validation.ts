/**
 * Group Validation Rules
 *
 * Pure validation functions for Group entity.
 * Extracted for testability and reusability.
 */

import type { GroupProps } from '../entities/group.entity';

export interface GroupValidationResult {
  isValid: boolean;
  errors: string[];
}

const VALID_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const MAX_NAME_LENGTH = 50;
const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export function validateGroupName(name: string): string | null {
  if (!name || name.length === 0) {
    return 'Group name cannot be empty';
  }
  if (!VALID_NAME_PATTERN.test(name)) {
    return `Group name "${name}" must start with lowercase letter and contain only lowercase letters, numbers, and underscores`;
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Group name cannot exceed ${MAX_NAME_LENGTH} characters`;
  }
  return null;
}

export function validateDisplayName(displayName: string): string | null {
  if (!displayName || displayName.length === 0) {
    return 'Group displayName cannot be empty';
  }
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return `Group displayName cannot exceed ${MAX_DISPLAY_NAME_LENGTH} characters`;
  }
  return null;
}

export function validateDescription(description?: string): string | null {
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    return `Group description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  return null;
}

export function validateParentId(
  parentId: string | undefined,
  id: string,
): string | null {
  if (parentId && parentId === id && id !== '') {
    return 'Group cannot be its own parent';
  }
  return null;
}

export function validateGroup(props: GroupProps): GroupValidationResult {
  const errors: string[] = [];

  const nameError = validateGroupName(props.name);
  if (nameError) errors.push(nameError);

  const displayNameError = validateDisplayName(props.displayName);
  if (displayNameError) errors.push(displayNameError);

  const descriptionError = validateDescription(props.description);
  if (descriptionError) errors.push(descriptionError);

  const parentError = validateParentId(props.parentId, props.id);
  if (parentError) errors.push(parentError);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/** Throws if validation fails */
export function assertGroupValid(props: GroupProps): void {
  const result = validateGroup(props);
  if (!result.isValid) {
    throw new Error(result.errors[0]);
  }
}

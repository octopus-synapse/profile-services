/**
 * Feature-flag domain exceptions. The HTTP layer maps `code` →
 * localized message via the i18n catalog.
 */
import {
  ConflictException,
  DomainException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class FeatureFlagNotFoundException extends EntityNotFoundException {
  readonly code: string = 'FEATURE_FLAG_NOT_FOUND';
  constructor(public readonly key: string) {
    super('FeatureFlag', key);
  }
}

export class FeatureFlagInvalidInputException extends ValidationException {
  readonly code: string = 'FEATURE_FLAG_INVALID_INPUT';
  constructor(reason: string) {
    super(`Invalid feature-flag input: ${reason}`);
  }
}

export class FeatureFlagDeprecatedException extends ValidationException {
  readonly code: string = 'FEATURE_FLAG_DEPRECATED';
  constructor(public readonly key: string) {
    super(
      `Flag "${key}" is deprecated and cannot be toggled. Remove it from the registry or re-add and redeploy.`,
    );
  }
}

export class FeatureFlagParentDisabledException extends ConflictException {
  readonly code: string = 'FEATURE_FLAG_PARENT_DISABLED';
  constructor(
    public readonly child: string,
    public readonly parent: string,
  ) {
    super(`Cannot enable "${child}": parent flag "${parent}" is disabled`);
  }
}

/**
 * Endpoint-level feature gate denied access — the route exists but is
 * served as a 404 to keep the surface invisible to clients without the
 * flag enabled.
 */
export class FeatureFlagDisabledException extends DomainException {
  readonly code: string = 'FEATURE_FLAG_DISABLED';
  readonly statusHint = 404;
  constructor() {
    super('Not Found');
  }
}

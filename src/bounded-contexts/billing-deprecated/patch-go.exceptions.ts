import { DomainException } from '@/shared-kernel/exceptions';

export class PatchGoRequiredException extends DomainException {
  readonly code = 'PATCH_GO_REQUIRED';
  readonly statusHint = 402; // lint-allow-magic-number: HTTP Payment Required
  constructor() {
    super('Patch Go subscription required');
  }
}

export class PatchGoLimitReachedException extends DomainException {
  readonly code = 'PATCH_GO_LIMIT_REACHED';
  readonly statusHint = 429;
  constructor() {
    super('Patch Go monthly preparation limit reached');
  }
}

export class PatchFreeTranslationLimitReachedException extends DomainException {
  readonly code = 'PATCH_FREE_TRANSLATION_LIMIT_REACHED';
  readonly statusHint = 429;
  constructor() {
    super('Patch Free monthly AI translation limit reached');
  }
}

export class PatchGoNotConfiguredException extends DomainException {
  readonly code = 'PATCH_GO_NOT_CONFIGURED';
  readonly statusHint = 503;
  constructor() {
    super('Patch Go checkout is not configured');
  }
}

/**
 * Resumes Bounded Context Exceptions
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class VariantNotFoundException extends DomainException {
  readonly code: string = 'RESUME_VARIANT_NOT_FOUND';
  readonly statusHint = 404;
  constructor(variantId?: string) {
    super(variantId ? `Variant ${variantId} not found` : 'Variant not found');
  }
}

/**
 * Domain Exception — Identity Shared Kernel
 *
 * Re-exports the canonical `DomainException` from the project shared kernel
 * so the identity BC keeps a single import surface without duplicating the
 * base class. The previous duplicate produced ghost codes
 * (CONFLICT / UNAUTHORIZED / VALIDATION_ERROR) in the i18n audit because two
 * distinct class identities declared the same string literal.
 */
export { DomainException } from '@/shared-kernel/exceptions/domain.exceptions';

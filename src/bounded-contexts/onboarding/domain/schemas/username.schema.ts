/**
 * Username Schema (Onboarding contract)
 *
 * Re-exports the canonical username schema from the identity domain
 * so the onboarding payload validation stays in sync with the rest of
 * the system.
 */

export { RESERVED_USERNAMES, UsernameSchema } from '@/shared-kernel/schemas/primitives';

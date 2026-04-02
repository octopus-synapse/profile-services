/**
 * Two-Factor Auth Bounded Context
 *
 * Public exports for the two-factor authentication module.
 */

export type { Validate2faInboundPort as Validate2faPort } from './application/ports';

// Application Layer
export * from './application/ports';
// Legacy aliases for backward compatibility
// TODO: Remove after all consumers are updated
export { VALIDATE_2FA_INBOUND_PORT as VALIDATE_2FA_PORT } from './application/ports';
export * from './application/use-cases';
// Domain Layer
export * from './domain';
// Infrastructure Layer
export * from './infrastructure';
// Testing (for use in tests)
export * from './testing';
// Module
export * from './two-factor-auth.module';

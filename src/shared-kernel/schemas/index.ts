/**
 * Schemas Module
 *
 * Exports all Zod schemas organized by domain.
 * Consumers import schemas directly and create validators on-demand.
 *
 * @example
 * import { LoginCredentialsSchema, validate } from '@/shared-kernel';
 *
 * const result = validate(LoginCredentialsSchema, data);
 */

export * from './auth';
export * from './authorization';
export * from './common';
export * from './consent';
export * from './export';
export * from './gdpr';
export * from './primitives';
export * from './resume';
export * from './resume-ast';
export * from './sections';
export * from './theme';
export * from './two-factor';
export * from './user';

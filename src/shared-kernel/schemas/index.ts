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

export * from "./primitives";
export * from "./auth";
export * from "./resume";
export * from "./consent";
export * from "./authorization";
export * from "./theme";

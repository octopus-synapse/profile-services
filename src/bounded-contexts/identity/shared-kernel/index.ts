/**
 * Identity Shared Kernel
 *
 * Contains shared domain concepts, exceptions, ports, and adapters
 * that are used across all Identity bounded contexts.
 *
 * RULES:
 * - Domain layer has ZERO external dependencies
 * - Exceptions are framework-agnostic
 * - Ports define contracts (interfaces)
 * - Adapters implement infrastructure
 *
 * @module identity/shared-kernel
 */

// Adapters (for NestJS module composition)
export * from './adapters';
// Domain
export * from './domain';
export * from './domain/events';
export * from './domain/value-objects';
// Exceptions
export * from './exceptions';
// Infrastructure (guards, decorators, strategies)
export * from './infrastructure';
// Ports
export * from './ports';

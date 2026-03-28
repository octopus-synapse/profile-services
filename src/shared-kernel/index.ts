/**
 * Shared Kernel
 *
 * Central exports for cross-cutting concerns shared across all bounded contexts.
 *
 * This module exports ONLY truly shared infrastructure:
 * - Authorization (guards, decorators, permissions)
 * - Event Bus (domain events)
 * - Exceptions (base exceptions)
 * - Validation (generic utilities)
 * - Constants (pagination, errors, locale)
 * - Enums (used by 3+ contexts)
 * - Schemas (primitives, auth, common, sections)
 *
 * Context-specific code lives in bounded contexts, not here.
 */

// ============================================================================
// Authorization (Guards, Decorators, Permissions)
// ============================================================================
export * from './authorization';
// ============================================================================
// Constants (Cross-Cutting Only)
// ============================================================================
export * from './constants';
// ============================================================================
// Enums (Used by 3+ Contexts)
// ============================================================================
export * from './enums';
// ============================================================================
// Event Bus (Domain Events)
// ============================================================================
export {
  DomainEvent,
  EventBusModule,
  EventPublisher,
  type EventPublisherPort,
} from './event-bus';
// ============================================================================
// Exceptions (Base Exceptions)
// ============================================================================
export * from './exceptions';
// ============================================================================
// Schemas (Shared Validation Contracts)
// ============================================================================
export * from './schemas';
// ============================================================================
// Validation (Generic Utilities)
// ============================================================================
export * from './validation';

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
// Auth (Framework-Agnostic JWT Port)
// ============================================================================
export * from './auth';
// ============================================================================
// Authorization (Guards, Decorators, Permissions)
// ============================================================================
export * from './authorization';
// ============================================================================
// Cache (Framework-Agnostic Cache Port)
// ============================================================================
export * from './cache';
// ============================================================================
// Config (Framework-Agnostic Config Port)
// ============================================================================
export * from './config';
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
  EventBusPort,
  type EventHandler,
  EventPublisher,
  EventPublisherPort,
} from './event-bus';
// ============================================================================
// Exceptions (Base Exceptions)
// ============================================================================
export * from './exceptions';
// ============================================================================
// HTTP (Framework-Agnostic Route Descriptors + Pipeline + Adapter)
// ============================================================================
export * from './http';
// ============================================================================
// Jobs (Framework-Agnostic Queue + Cron Ports)
// ============================================================================
export * from './jobs';
// ============================================================================
// Lifecycle (Framework-Agnostic init/dispose Hooks)
// ============================================================================
export * from './lifecycle';
// ============================================================================
// Logger (Framework-Agnostic Logging Port)
// ============================================================================
export * from './logger';
// ============================================================================
// Persistence (Framework-Agnostic Prisma Port)
// ============================================================================
export * from './persistence';
// ============================================================================
// Schemas (Shared Validation Contracts)
// ============================================================================
export * from './schemas';
// ============================================================================
// Validation (Generic Utilities)
// ============================================================================
export * from './validation';

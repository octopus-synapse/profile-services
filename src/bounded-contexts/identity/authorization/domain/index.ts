/**
 * Authorization Domain Barrel Export
 *
 * Note: Types are available from ./entities for backward compatibility.
 * New code should use ./types for new type definitions.
 */
export * from './entities';
export * from './events';
export * from './ports';
export * from './services';
export * from './validation';

// Types are exported from entities for backward compatibility
// Import from './types' for new authorization types

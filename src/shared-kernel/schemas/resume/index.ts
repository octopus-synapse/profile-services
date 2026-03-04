/**
 * Resume Schemas
 *
 * Resume-related validation schemas.
 *
 * IMPORTANT: Section-specific schemas have been removed as part of the
 * generic sections refactoring. All section validation is now driven by
 * SectionType.definition in the database, using SectionDefinitionZodFactory
 * to dynamically build schemas.
 *
 * @see SectionDefinitionZodFactory
 * @see SectionTypeRepository
 */

// Resume aggregate schema
export * from './resume.schema';

import { z } from 'zod';

/**
 * Tech Persona Enum (Domain)
 *
 * Defines all available tech personas/archetypes.
 * Each persona represents a specific IT professional profile
 * with unique characteristics, skills, and career focus areas.
 *
 * Values use kebab-case for consistency with API/DSL.
 */
export const TechPersonaSchema = z.enum([
  'devops',
  'security',
  'data',
  'fullstack',
  'mobile',
  'ai-ml',
  'qa',
  'ux-ui',
  'backend',
  'frontend',
  'cloud',
  'game-dev',
]);

export type TechPersona = z.infer<typeof TechPersonaSchema>;

/**
 * TechPersona as a TypeScript enum for NestJS/runtime integration.
 * Use TechPersonaEnum.DEVOPS instead of 'devops' literal for type safety.
 */
export enum TechPersonaEnum {
  DEVOPS = 'devops',
  SECURITY = 'security',
  DATA = 'data',
  FULLSTACK = 'fullstack',
  MOBILE = 'mobile',
  AI_ML = 'ai-ml',
  QA = 'qa',
  UX_UI = 'ux-ui',
  BACKEND = 'backend',
  FRONTEND = 'frontend',
  CLOUD = 'cloud',
  GAME_DEV = 'game-dev',
}

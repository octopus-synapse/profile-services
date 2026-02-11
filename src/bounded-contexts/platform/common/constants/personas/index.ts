/**
 * Tech Personas - Barrel Export
 *
 * Aggregates all persona configurations into a single record
 * and re-exports types and helpers for clean imports.
 */

export { AI_ML_PERSONA } from './ai-ml.persona';
export { BACKEND_PERSONA } from './backend.persona';
export { CLOUD_PERSONA } from './cloud.persona';
export { DATA_PERSONA } from './data.persona';
// Individual Personas
export { DEVOPS_PERSONA } from './devops.persona';
export { FRONTEND_PERSONA } from './frontend.persona';
export { FULLSTACK_PERSONA } from './fullstack.persona';
export { GAME_DEV_PERSONA } from './game-dev.persona';
export { MOBILE_PERSONA } from './mobile.persona';
// Helpers
export {
  getAllPersonaIds,
  getPersonaConfig,
  isValidPersona,
  suggestPersona,
} from './persona.helpers';
// Aggregated registry (imported from separate file to avoid circular deps)
export { TECH_PERSONAS } from './persona.registry';
export type { PersonaConfig } from './persona-config.interface';
export { QA_PERSONA } from './qa.persona';
export { SECURITY_PERSONA } from './security.persona';
// Types and Enum
export { TechPersona } from './tech-persona.enum';
export { UX_UI_PERSONA } from './ux-ui.persona';

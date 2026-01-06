/**
 * Tech Personas - Barrel Export
 *
 * Aggregates all persona configurations into a single record
 * and re-exports types and helpers for clean imports.
 */

// Types and Enum
export { TechPersona } from './tech-persona.enum';
export { PersonaConfig } from './persona-config.interface';

// Individual Personas
export { DEVOPS_PERSONA } from './devops.persona';
export { SECURITY_PERSONA } from './security.persona';
export { DATA_PERSONA } from './data.persona';
export { AI_ML_PERSONA } from './ai-ml.persona';
export { FULLSTACK_PERSONA } from './fullstack.persona';
export { MOBILE_PERSONA } from './mobile.persona';
export { QA_PERSONA } from './qa.persona';
export { UX_UI_PERSONA } from './ux-ui.persona';
export { BACKEND_PERSONA } from './backend.persona';
export { FRONTEND_PERSONA } from './frontend.persona';
export { CLOUD_PERSONA } from './cloud.persona';
export { GAME_DEV_PERSONA } from './game-dev.persona';

// Helpers
export {
  getPersonaConfig,
  suggestPersona,
  getAllPersonaIds,
  isValidPersona,
} from './persona.helpers';

// Aggregated registry (imported from separate file to avoid circular deps)
export { TECH_PERSONAS } from './persona.registry';

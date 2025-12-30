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

// Import personas for aggregation
import { TechPersona } from './tech-persona.enum';
import { PersonaConfig } from './persona-config.interface';
import { DEVOPS_PERSONA } from './devops.persona';
import { SECURITY_PERSONA } from './security.persona';
import { DATA_PERSONA } from './data.persona';
import { AI_ML_PERSONA } from './ai-ml.persona';
import { FULLSTACK_PERSONA } from './fullstack.persona';
import { MOBILE_PERSONA } from './mobile.persona';
import { QA_PERSONA } from './qa.persona';
import { UX_UI_PERSONA } from './ux-ui.persona';
import { BACKEND_PERSONA } from './backend.persona';
import { FRONTEND_PERSONA } from './frontend.persona';
import { CLOUD_PERSONA } from './cloud.persona';
import { GAME_DEV_PERSONA } from './game-dev.persona';

/**
 * Aggregated record of all tech personas
 *
 * Use this for iterating over all personas or
 * accessing a specific persona by its enum key.
 */
export const TECH_PERSONAS: Record<TechPersona, PersonaConfig> = {
  [TechPersona.DEVOPS]: DEVOPS_PERSONA,
  [TechPersona.SECURITY]: SECURITY_PERSONA,
  [TechPersona.DATA]: DATA_PERSONA,
  [TechPersona.AI_ML]: AI_ML_PERSONA,
  [TechPersona.FULLSTACK]: FULLSTACK_PERSONA,
  [TechPersona.MOBILE]: MOBILE_PERSONA,
  [TechPersona.QA]: QA_PERSONA,
  [TechPersona.UX_UI]: UX_UI_PERSONA,
  [TechPersona.BACKEND]: BACKEND_PERSONA,
  [TechPersona.FRONTEND]: FRONTEND_PERSONA,
  [TechPersona.CLOUD]: CLOUD_PERSONA,
  [TechPersona.GAME_DEV]: GAME_DEV_PERSONA,
};

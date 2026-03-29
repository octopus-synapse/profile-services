/**
 * Tech Personas - convenience re-export.
 *
 * Persona definitions live under ./personas/.
 *
 * @see ./personas/index.ts
 */

// Type re-export
export type { PersonaConfig } from './personas';
export {
  AI_ML_PERSONA,
  BACKEND_PERSONA,
  CLOUD_PERSONA,
  DATA_PERSONA,
  // Individual personas (for direct access if needed)
  DEVOPS_PERSONA,
  FRONTEND_PERSONA,
  FULLSTACK_PERSONA,
  GAME_DEV_PERSONA,
  getAllPersonaIds,
  // Helper functions
  getPersonaConfig,
  isValidPersona,
  MOBILE_PERSONA,
  QA_PERSONA,
  SECURITY_PERSONA,
  suggestPersona,
  // Aggregated record
  TECH_PERSONAS,
  type TechPersona,
  // Enum
  TechPersonaEnum,
  UX_UI_PERSONA,
} from './personas';

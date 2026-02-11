/**
 * Tech Personas - Re-export for backward compatibility
 *
 * This file has been refactored. All persona definitions are now
 * split into individual files under ./personas/ directory.
 *
 * @see ./personas/index.ts for the new structure
 * @deprecated Import directly from './personas' instead
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
  // Enum
  TechPersona,
  UX_UI_PERSONA,
} from './personas';

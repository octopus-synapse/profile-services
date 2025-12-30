/**
 * Tech Personas - Re-export for backward compatibility
 *
 * This file has been refactored. All persona definitions are now
 * split into individual files under ./personas/ directory.
 *
 * @see ./personas/index.ts for the new structure
 * @deprecated Import directly from './personas' instead
 */

export {
  // Enum & Types
  TechPersona,
  PersonaConfig,
  // Aggregated record
  TECH_PERSONAS,
  // Individual personas (for direct access if needed)
  DEVOPS_PERSONA,
  SECURITY_PERSONA,
  DATA_PERSONA,
  AI_ML_PERSONA,
  FULLSTACK_PERSONA,
  MOBILE_PERSONA,
  QA_PERSONA,
  UX_UI_PERSONA,
  BACKEND_PERSONA,
  FRONTEND_PERSONA,
  CLOUD_PERSONA,
  GAME_DEV_PERSONA,
  // Helper functions
  getPersonaConfig,
  suggestPersona,
  getAllPersonaIds,
  isValidPersona,
} from './personas';

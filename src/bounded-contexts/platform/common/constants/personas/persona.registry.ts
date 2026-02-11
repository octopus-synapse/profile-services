/**
 * Tech Personas Registry
 *
 * Aggregates all persona configurations into a single record.
 * Separated from index.ts to avoid circular dependencies.
 */

import { AI_ML_PERSONA } from './ai-ml.persona';
import { BACKEND_PERSONA } from './backend.persona';
import { CLOUD_PERSONA } from './cloud.persona';
import { DATA_PERSONA } from './data.persona';
import { DEVOPS_PERSONA } from './devops.persona';
import { FRONTEND_PERSONA } from './frontend.persona';
import { FULLSTACK_PERSONA } from './fullstack.persona';
import { GAME_DEV_PERSONA } from './game-dev.persona';
import { MOBILE_PERSONA } from './mobile.persona';
import { PersonaConfig } from './persona-config.interface';
import { QA_PERSONA } from './qa.persona';
import { SECURITY_PERSONA } from './security.persona';
import { TechPersona } from './tech-persona.enum';
import { UX_UI_PERSONA } from './ux-ui.persona';

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

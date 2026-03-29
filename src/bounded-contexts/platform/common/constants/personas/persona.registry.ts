/**
 * Tech Personas Registry
 *
 * Aggregates all persona configurations into a single record.
 * Separated from index.ts to avoid circular dependencies.
 */

import { TechPersona, TechPersonaEnum } from '@/bounded-contexts/platform/domain/enums';
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
import { UX_UI_PERSONA } from './ux-ui.persona';

/**
 * Aggregated record of all tech personas
 *
 * Use this for iterating over all personas or
 * accessing a specific persona by its enum key.
 */
export const TECH_PERSONAS: Record<TechPersona, PersonaConfig> = {
  [TechPersonaEnum.DEVOPS]: DEVOPS_PERSONA,
  [TechPersonaEnum.SECURITY]: SECURITY_PERSONA,
  [TechPersonaEnum.DATA]: DATA_PERSONA,
  [TechPersonaEnum.AI_ML]: AI_ML_PERSONA,
  [TechPersonaEnum.FULLSTACK]: FULLSTACK_PERSONA,
  [TechPersonaEnum.MOBILE]: MOBILE_PERSONA,
  [TechPersonaEnum.QA]: QA_PERSONA,
  [TechPersonaEnum.UX_UI]: UX_UI_PERSONA,
  [TechPersonaEnum.BACKEND]: BACKEND_PERSONA,
  [TechPersonaEnum.FRONTEND]: FRONTEND_PERSONA,
  [TechPersonaEnum.CLOUD]: CLOUD_PERSONA,
  [TechPersonaEnum.GAME_DEV]: GAME_DEV_PERSONA,
};

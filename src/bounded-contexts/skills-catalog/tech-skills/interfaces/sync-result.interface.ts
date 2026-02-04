/**
 * Sync Result Types
 * Types for tech skills sync operation results
 */

export interface TechSkillsSyncResult {
  languagesInserted: number;
  languagesUpdated: number;
  skillsInserted: number;
  skillsUpdated: number;
  areasCreated: number;
  nichesCreated: number;
  errors: string[];
}

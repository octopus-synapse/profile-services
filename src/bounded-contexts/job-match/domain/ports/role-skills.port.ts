/**
 * In-demand skills for a role/occupation title — the "market" side of the
 * Readiness coverage factor. Implementations aggregate real internal job
 * postings first and fall back to an LLM when postings are too sparse; the
 * caller doesn't care which. Empty result = unknown role.
 */
export abstract class RoleSkillsPort {
  abstract getInDemandSkills(
    roleLabel: string,
    language?: string | null,
  ): Promise<readonly string[]>;
}

/**
 * Prompt v1 — in-demand skills for a role title. Used as the fallback for
 * market-relative Readiness coverage when internal job postings for the
 * role are too sparse to aggregate real skills from. Deterministic-ish
 * (low temperature); returns a compact, normalised skill list.
 */
import type { RoleSkillsInput } from '../ports/scoring-llm.port';

export const ROLE_IN_DEMAND_SKILLS_PROMPT_VERSION = '1.0.0';

export const ROLE_IN_DEMAND_SKILLS_SYSTEM_PROMPT = [
  'You are a labor-market analyst. Given a job/occupation title, list the',
  'concrete skills, tools, and technologies most commonly required for that',
  'role in the current market.',
  'Rules:',
  '- Return 8 to 15 skills, most important first.',
  '- Use short canonical names (e.g. "TypeScript", "Docker", "SQL", "REST APIs"),',
  '  not sentences. No soft-skill fluff unless it is genuinely defining.',
  '- Deduplicate. Do not invent niche tools that are not broadly expected.',
  '- Answer in the requested language for any descriptive words, but keep',
  '  proper technology names in their canonical form.',
  'Return strictly JSON: { "skills": string[] }.',
].join(' ');

export function buildRoleInDemandSkillsUserMessage(input: RoleSkillsInput): string {
  const lang = input.language === 'pt-br' ? 'Portuguese (Brazil)' : 'English';
  return [
    `Role title: ${input.roleLabel}`,
    `Language: ${lang}`,
    'List the in-demand skills for this role as JSON { "skills": [...] }.',
  ].join('\n');
}

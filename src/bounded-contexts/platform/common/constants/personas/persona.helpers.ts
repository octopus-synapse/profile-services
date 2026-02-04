import { TechPersona } from './tech-persona.enum';
import { PersonaConfig } from './persona-config.interface';
import { TECH_PERSONAS } from './persona.registry';

/**
 * Get configuration for a specific persona
 */
export function getPersonaConfig(persona: TechPersona): PersonaConfig {
  return TECH_PERSONAS[persona];
}

/**
 * Suggest persona based on job title and skills
 *
 * Analyzes keywords from job title and skills to find the best matching
 * persona. Returns FULLSTACK as default if no strong match is found.
 */
export function suggestPersona(
  jobTitle: string,
  skills: string[],
): TechPersona {
  const jobLower = jobTitle.toLowerCase();
  const skillsLower = skills.map((s) => s.toLowerCase());

  for (const [persona, config] of Object.entries(TECH_PERSONAS)) {
    const matchingKeywords = config.keywords.filter(
      (keyword) =>
        jobLower.includes(keyword) ||
        skillsLower.some((skill) => skill.includes(keyword)),
    );

    if (matchingKeywords.length > 3) {
      return persona as TechPersona;
    }
  }

  return TechPersona.FULLSTACK;
}

/**
 * Get all available persona IDs
 */
export function getAllPersonaIds(): TechPersona[] {
  return Object.values(TechPersona);
}

/**
 * Check if a string is a valid persona ID
 */
export function isValidPersona(value: string): value is TechPersona {
  return Object.values(TechPersona).includes(value as TechPersona);
}

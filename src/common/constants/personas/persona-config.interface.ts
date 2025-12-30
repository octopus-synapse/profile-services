import { TechPersona } from './tech-persona.enum';

/**
 * Persona Configuration Interface
 *
 * Defines the structure for each tech persona's configuration,
 * including visual styling, relevant skills, and priority sections.
 */
export interface PersonaConfig {
  /** Unique persona identifier */
  id: TechPersona;

  /** Display name for the persona */
  name: string;

  /** Short description of the persona's focus */
  description: string;

  /** Emoji or icon name representing the persona */
  icon: string;

  /** Primary theme color (hex) */
  primaryColor: string;

  /** Accent/secondary color (hex) */
  accentColor: string;

  /** Gradient colors for visual effects [start, end] */
  gradient: [string, string];

  /** Relevant skill categories for this persona */
  skillCategories: string[];

  /** Types of achievements relevant to this persona */
  achievementTypes: string[];

  /** Resume sections that should be highlighted */
  prioritySections: string[];

  /** Keywords for persona detection and suggestions */
  keywords: string[];
}

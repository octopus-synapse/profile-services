import { TechPersona } from './tech-persona.enum';
import { PersonaConfig } from './persona-config.interface';

export const UX_UI_PERSONA: PersonaConfig = {
  id: TechPersona.UX_UI,
  name: 'UX/UI Designer',
  description: 'User Experience, Interface Design, Prototyping',
  icon: '🎨',
  primaryColor: '#EC4899',
  accentColor: '#DB2777',
  gradient: ['#EC4899', '#F59E0B'],
  skillCategories: [
    'UI Design',
    'UX Research',
    'Prototyping',
    'Design Systems',
    'User Testing',
    'Interaction Design',
    'Design Tools',
  ],
  achievementTypes: [
    'design_awards',
    'case_studies',
    'user_satisfaction',
    'design_system_adoption',
  ],
  prioritySections: ['projects', 'awards', 'experiences', 'certifications'],
  keywords: [
    'figma',
    'sketch',
    'adobe-xd',
    'prototyping',
    'wireframing',
    'user-research',
    'usability-testing',
    'design-systems',
    'accessibility',
    'responsive-design',
    'interaction-design',
  ],
};

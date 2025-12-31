/**
 * Stack Overflow Skill Categories - Design, Security & Tools
 *
 * Maps design, security, and general tool tags to skill types and niches.
 */

import type { SkillType } from '../interfaces';

type SkillCategory = { type: SkillType; niche: string | null };

export const DESIGN_CATEGORIES: Record<string, SkillCategory> = {
  figma: { type: 'TOOL', niche: 'design' },
  sketch: { type: 'TOOL', niche: 'design' },
  'adobe-xd': { type: 'TOOL', niche: 'design' },
  invision: { type: 'TOOL', niche: 'design' },
  zeplin: { type: 'TOOL', niche: 'design' },
  tailwindcss: { type: 'FRAMEWORK', niche: 'frontend' },
  'tailwind-css': { type: 'FRAMEWORK', niche: 'frontend' },
  bootstrap: { type: 'FRAMEWORK', niche: 'frontend' },
  'material-ui': { type: 'LIBRARY', niche: 'frontend' },
  'chakra-ui': { type: 'LIBRARY', niche: 'frontend' },
  'ant-design': { type: 'LIBRARY', niche: 'frontend' },
  'styled-components': { type: 'LIBRARY', niche: 'frontend' },
  emotion: { type: 'LIBRARY', niche: 'frontend' },
  sass: { type: 'TOOL', niche: 'frontend' },
  less: { type: 'TOOL', niche: 'frontend' },
  storybook: { type: 'TOOL', niche: 'frontend' },
};

export const SECURITY_CATEGORIES: Record<string, SkillCategory> = {
  oauth: { type: 'METHODOLOGY', niche: 'security' },
  jwt: { type: 'METHODOLOGY', niche: 'security' },
  owasp: { type: 'METHODOLOGY', niche: 'security' },
  'penetration-testing': { type: 'METHODOLOGY', niche: 'security' },
  'burp-suite': { type: 'TOOL', niche: 'security' },
  nmap: { type: 'TOOL', niche: 'security' },
  wireshark: { type: 'TOOL', niche: 'security' },
  metasploit: { type: 'TOOL', niche: 'security' },
  'kali-linux': { type: 'PLATFORM', niche: 'security' },
  'hashicorp-vault': { type: 'TOOL', niche: 'security' },
};

export const COLLABORATION_CATEGORIES: Record<string, SkillCategory> = {
  git: { type: 'TOOL', niche: null },
  github: { type: 'PLATFORM', niche: null },
  gitlab: { type: 'PLATFORM', niche: null },
  bitbucket: { type: 'PLATFORM', niche: null },
  jira: { type: 'TOOL', niche: null },
  confluence: { type: 'TOOL', niche: null },
  slack: { type: 'TOOL', niche: null },
  notion: { type: 'TOOL', niche: null },
  trello: { type: 'TOOL', niche: null },
  asana: { type: 'TOOL', niche: null },
  linear: { type: 'TOOL', niche: null },
};

/**
 * Skill Metadata Utilities
 *
 * Functions to get aliases and keywords for skills.
 */

const ALIAS_MAP: Record<string, string[]> = {
  react: ['reactjs', 'react.js'],
  'vue.js': ['vuejs', 'vue'],
  'node.js': ['nodejs', 'node'],
  'next.js': ['nextjs', 'next'],
  angular: ['angularjs', 'ng'],
  express: ['expressjs', 'express.js'],
  typescript: ['ts'],
  javascript: ['js', 'es6', 'ecmascript'],
  kubernetes: ['k8s'],
  postgresql: ['postgres', 'psql'],
  mongodb: ['mongo'],
  elasticsearch: ['elastic', 'es'],
  tailwindcss: ['tailwind', 'tailwind-css'],
};

const KEYWORD_MAP: Record<string, string[]> = {
  react: ['ui', 'components', 'hooks', 'jsx', 'frontend'],
  'node.js': ['server', 'backend', 'runtime', 'npm'],
  docker: ['container', 'containerization', 'devops'],
  kubernetes: ['orchestration', 'container', 'cluster', 'devops'],
  aws: ['cloud', 'amazon', 'infrastructure'],
  postgresql: ['database', 'sql', 'relational'],
  mongodb: ['database', 'nosql', 'document'],
  graphql: ['api', 'query', 'schema'],
  tensorflow: ['ai', 'ml', 'deep-learning', 'neural-network'],
  figma: ['design', 'ui', 'ux', 'prototype'],
};

/**
 * Get aliases for a skill
 */
export function getAliases(name: string): string[] {
  const lower = name.toLowerCase();
  return Object.hasOwn(ALIAS_MAP, lower) ? ALIAS_MAP[lower] : [];
}

/**
 * Get search keywords for a skill
 */
export function getKeywords(name: string): string[] {
  const lower = name.toLowerCase();
  return Object.hasOwn(KEYWORD_MAP, lower) ? KEYWORD_MAP[lower] : [];
}
